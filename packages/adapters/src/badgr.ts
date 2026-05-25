import OpenAI from 'openai';
import {
  InferenceAdapter,
  InferenceRequest,
  InferenceResponse,
  ToolCall,
} from '@agentjeff/core';

export interface BadgrAdapterOptions {
  apiKey?: string;
  model?: string;
  baseURL?: string;
}

export class BadgrAdapter implements InferenceAdapter {
  private client: OpenAI;
  private model: string;

  constructor(opts: BadgrAdapterOptions = {}) {
    this.client = new OpenAI({
      apiKey: opts.apiKey ?? process.env.BADGR_API_KEY ?? '',
      baseURL: opts.baseURL ?? process.env.BADGR_BASE_URL ?? 'https://aibadgr.com/v1',
    });
    this.model = opts.model ?? 'gpt-4o';
  }

  async complete(req: InferenceRequest): Promise<InferenceResponse> {
    const tools =
      req.tools && req.tools.length > 0
        ? req.tools.map((t) => ({
            type: 'function' as const,
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters as Record<string, unknown>,
            },
          }))
        : undefined;

    // Map our Message union to OpenAI's expected format.
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = req.messages.map((m) => {
      if (m.role === 'tool') {
        return { role: 'tool', tool_call_id: m.toolCallId, content: m.content };
      }
      if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
        return {
          role: 'assistant',
          content: m.content ?? null,
          tool_calls: m.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
          })),
        };
      }
      return { role: m.role, content: m.content as string };
    });

    const response = await this.client.chat.completions.create({
      model: req.model ?? this.model,
      messages,
      tools,
      temperature: req.temperature,
      max_tokens: req.maxTokens,
    });

    const choice = response.choices[0];
    const msg = choice.message;

    const toolCalls: ToolCall[] = (msg.tool_calls ?? []).map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments || '{}'),
    }));

    return {
      content: msg.content,
      toolCalls,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
          }
        : undefined,
    };
  }
}
