export type Message =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; toolCalls?: ToolCall[] }
  | { role: 'tool'; toolCallId: string; content: string };

export interface InferenceRequest {
  messages: Message[];
  tools?: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface InferenceResponse {
  content: string | null;
  toolCalls: ToolCall[];
  usage?: { promptTokens: number; completionTokens: number };
}

export interface InferenceAdapter {
  complete(request: InferenceRequest): Promise<InferenceResponse>;
}

export interface WorkspaceAdapter {
  listFiles(dir: string): Promise<string[]>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exec?(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }>;
}
