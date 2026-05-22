import { z } from 'zod';
import { ToolDef } from './tool';
import { RetryPolicy } from './policy';

export interface AgentDef<
  TInput extends z.ZodTypeAny = z.ZodTypeAny,
  TOutput extends z.ZodTypeAny = z.ZodTypeAny
> {
  name: string;
  instructions: string;
  inputSchema: TInput;
  outputSchema: TOutput;
  tools: ToolDef[];
  runtimeOptions?: {
    maxSteps?: number;
    timeoutMs?: number;
    retryPolicy?: RetryPolicy;
  };
}

export type { RetryPolicy };
