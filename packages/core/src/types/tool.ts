import { z } from 'zod';

export interface ToolDef<
  TInput extends z.ZodTypeAny = z.ZodTypeAny,
  TOutput extends z.ZodTypeAny = z.ZodTypeAny
> {
  name: string;
  description: string;
  inputSchema: TInput;
  outputSchema: TOutput;
  permissions?: string[];
  execute(input: z.infer<TInput>, ctx: ToolContext): Promise<z.infer<TOutput>>;
}

export interface ToolContext {
  runId: string;
  agentName: string;
  emit: (event: import('./event').AgentEvent) => void;
}
