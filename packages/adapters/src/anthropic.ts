import Anthropic from '@anthropic-ai/sdk';
import {
  InferenceAdapter,
  InferenceRequest,
  InferenceResponse,
  Message,
  ToolCall,
} from '@agentjeff/core';

export interface AnthropicAdapterOptions {
  apiKey?: string;
  model?: string;
}

export class AnthropicAdapter implements InferenceAdapter {
  private client: Anthropic;
  private model: string;

  constructor(opts: AnthropicAdapterOptions = {}) {
    this.client = new Anthropic({
      apiKey: opts.apiKey ?? process.env.ANTHROPIC_API_KEY ?? '',
    });
    this.model = opts.model ?? 'claude-opus-4-7';
  }

  async complete(req: InferenceRequest): Promise<InferenceResponse> {
    const system = req.messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n') || undefined;

    const messages = this.convertMessages(req.messages.filter((m) => m.role !== 'system'));

    const tools: Anthropic.Tool[] | undefined =
      req.tools && req.tools.length > 0
        ? req.tools.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: t.parameters as Anthropic.Tool['input_schema'],
          }))
        : undefined;

    const response = await this.client.messages.create({
      model: req.model ?? this.model,
      max_tokens: req.maxTokens ?? 4096,
      system,
      messages,
      tools,
      temperature: req.temperature,
    });

    let content: string | null = null;
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        content = block.text || null;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        });
      }
    }

    return {
      content,
      toolCalls,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
      },
    };
  }

  private convertMessages(messages: Message[]): Anthropic.MessageParam[] {
    const result: Anthropic.MessageParam[] = [];

    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];

      if (m.role === 'user') {
        result.push({ role: 'user', content: m.content as string });
      } else if (m.role === 'assistant') {
        const content: Anthropic.ContentBlockParam[] = [];
        if (m.content) {
          content.push({ type: 'text', text: m.content });
        }
        if (m.toolCalls && m.toolCalls.length > 0) {
          for (const tc of m.toolCalls) {
            content.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.arguments });
          }
        }
        if (content.length > 0) {
          result.push({ role: 'assistant', content });
        }
      } else if (m.role === 'tool') {
        // Collect consecutive tool results into a single user message
        const toolResults: Anthropic.ToolResultBlockParam[] = [
          { type: 'tool_result', tool_use_id: m.toolCallId, content: m.content },
        ];
        while (i + 1 < messages.length && messages[i + 1].role === 'tool') {
          i++;
          const next = messages[i] as Extract<Message, { role: 'tool' }>;
          toolResults.push({
            type: 'tool_result',
            tool_use_id: next.toolCallId,
            content: next.content,
          });
        }
        result.push({ role: 'user', content: toolResults });
      }
    }

    return result;
  }
}
