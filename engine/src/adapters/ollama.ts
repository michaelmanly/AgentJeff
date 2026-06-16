import { InferenceAdapter, InferenceRequest, InferenceResponse, ToolCall } from '../types.js';
import { logger } from '../utils/logger.js';

export interface OllamaAdapterOptions {
  model?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export class OllamaAdapter implements InferenceAdapter {
  private model: string;
  private baseUrl: string;
  private temperature: number;
  private maxTokens: number;

  constructor(opts: OllamaAdapterOptions = {}) {
    this.model = opts.model ?? 'qwen2.5-coder:14b';
    this.baseUrl = (opts.baseUrl ?? 'http://localhost:11434').replace(/\/$/, '');
    this.temperature = opts.temperature ?? 0.3;
    this.maxTokens = opts.maxTokens ?? 2048;
  }

  async complete(req: InferenceRequest): Promise<InferenceResponse> {
    const model = req.model ?? this.model;
    const messages = req.messages.map((m) => {
      if (m.role === 'tool') {
        return { role: 'tool', tool_call_id: m.toolCallId, content: m.content ?? '' };
      }
      if (m.role === 'assistant' && m.toolCalls?.length) {
        return {
          role: 'assistant',
          content: m.content ?? '',
          tool_calls: m.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
          })),
        };
      }
      return { role: m.role, content: m.content ?? '' };
    });

    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: req.temperature ?? this.temperature,
      max_tokens: req.maxTokens ?? this.maxTokens,
      stream: false,
    };

    if (req.tools?.length) {
      body.tools = req.tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
    }

    const resp = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Ollama error ${resp.status}: ${text}`);
    }

    const data = (await resp.json()) as any;
    const choice = data.choices?.[0];
    const message = choice?.message ?? {};

    const toolCalls: ToolCall[] = (message.tool_calls ?? []).map((tc: any) => ({
      id: tc.id ?? `tc-${Date.now()}`,
      name: tc.function?.name ?? '',
      arguments: (() => {
        try {
          return typeof tc.function?.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : tc.function?.arguments ?? {};
        } catch {
          return {};
        }
      })(),
    }));

    return {
      content: message.content ?? null,
      toolCalls,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens ?? 0,
            completionTokens: data.usage.completion_tokens ?? 0,
          }
        : undefined,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (!resp.ok) return false;
      const data = (await resp.json()) as any;
      const models: string[] = (data.models ?? []).map((m: any) => m.name as string);
      return models.some((m) => m.startsWith(this.model.split(':')[0]));
    } catch {
      return false;
    }
  }

  withModel(model: string): OllamaAdapter {
    return new OllamaAdapter({ model, baseUrl: this.baseUrl, temperature: this.temperature, maxTokens: this.maxTokens });
  }
}

export class FallbackAdapter implements InferenceAdapter {
  private counter = 0;
  private scenarioTypes = [
    'edge-case', 'regression', 'performance', 'missing-test',
    'adversarial-review', 'unsafe-change', 'benchmark-degradation', 'flaky-test',
  ];

  async complete(req: InferenceRequest): Promise<InferenceResponse> {
    const systemMsg = req.messages.find((m) => m.role === 'system')?.content ?? '';
    const userMsg = req.messages.find((m) => m.role === 'user')?.content ?? '';

    if (systemMsg.includes('objective') || systemMsg.includes('goal')) {
      const type = this.scenarioTypes[this.counter++ % this.scenarioTypes.length];
      return {
        content: JSON.stringify({
          id: `obj-${Date.now()}`,
          description: `Find and fix ${type} issues in the sandbox repo`,
          type,
          priority: 5,
          targetFile: 'src/calculator.ts',
          createdAt: Date.now(),
        }),
        toolCalls: [],
      };
    }

    if (systemMsg.includes('proposal') || systemMsg.includes('action')) {
      return {
        content: JSON.stringify({
          description: 'Add input validation to prevent edge cases',
          changes: [],
          rationale: 'Fallback: no Ollama available, skipping actual change',
        }),
        toolCalls: [],
      };
    }

    if (systemMsg.includes('critique')) {
      return {
        content: JSON.stringify({
          approved: true,
          warnings: [],
          risks: [],
          suggestions: ['Consider adding more edge case tests'],
        }),
        toolCalls: [],
      };
    }

    if (systemMsg.includes('scenario')) {
      return {
        content: JSON.stringify({
          description: `Test ${this.scenarioTypes[this.counter % this.scenarioTypes.length]} scenario`,
          type: this.scenarioTypes[this.counter++ % this.scenarioTypes.length],
        }),
        toolCalls: [],
      };
    }

    return { content: 'Fallback response: Ollama unavailable', toolCalls: [] };
  }
}
