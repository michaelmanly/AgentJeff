import type { InferenceAdapter, InferenceRequest, InferenceResponse, Message, ToolCall } from '../types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('OllamaAdapter');

interface OllamaMessage {
  role: string;
  content: string;
  tool_calls?: OllamaToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface OllamaToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface OllamaResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: OllamaToolCall[];
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export interface OllamaAdapterOptions {
  model?: string;
  baseUrl?: string;
  temperature?: number;
}

export class OllamaAdapter implements InferenceAdapter {
  private model: string;
  private baseUrl: string;
  private temperature: number;

  constructor(private opts: OllamaAdapterOptions = {}) {
    this.model = opts.model ?? 'qwen2.5-coder:14b';
    this.baseUrl = opts.baseUrl ?? 'http://localhost:11434';
    this.temperature = opts.temperature ?? 0.3;
  }

  async complete(req: InferenceRequest): Promise<InferenceResponse> {
    const model = req.model ?? this.model;
    const temperature = req.temperature ?? this.temperature;

    const messages: OllamaMessage[] = req.messages.map(m => this.toOllamaMessage(m));

    const body: Record<string, unknown> = {
      model,
      messages,
      temperature,
      stream: false,
    };

    if (req.maxTokens) {
      body['max_tokens'] = req.maxTokens;
    }

    if (req.tools && req.tools.length > 0) {
      body['tools'] = req.tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
    }

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as OllamaResponse;
    const choice = data.choices[0];

    if (!choice) {
      throw new Error('No choices in Ollama response');
    }

    const toolCalls: ToolCall[] = (choice.message.tool_calls ?? []).map(tc => ({
      id: tc.id,
      name: tc.function.name,
      arguments: (() => {
        try {
          return JSON.parse(tc.function.arguments) as Record<string, unknown>;
        } catch {
          return { raw: tc.function.arguments };
        }
      })(),
    }));

    return {
      content: choice.message.content,
      toolCalls,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
          }
        : undefined,
    };
  }

  private toOllamaMessage(m: Message): OllamaMessage {
    const msg: OllamaMessage = {
      role: m.role === 'tool' ? 'tool' : m.role,
      content: m.content,
    };
    if (m.toolCallId) msg.tool_call_id = m.toolCallId;
    if (m.name) msg.name = m.name;
    return msg;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return false;
      const data = (await response.json()) as { models?: Array<{ name: string }> };
      const models = data.models ?? [];
      return models.some(m => m.name.startsWith(this.model.split(':')[0]));
    } catch {
      return false;
    }
  }
}
