import { z } from 'zod';
import { AgentDef, ToolDef, ToolContext } from '@agentjeff/core';

export function defineAgent<
  TInput extends z.ZodTypeAny,
  TOutput extends z.ZodTypeAny
>(def: AgentDef<TInput, TOutput>): AgentDef<TInput, TOutput> {
  return def;
}

export function defineTool<
  TInput extends z.ZodTypeAny,
  TOutput extends z.ZodTypeAny
>(def: ToolDef<TInput, TOutput>): ToolDef<TInput, TOutput> {
  return def;
}
