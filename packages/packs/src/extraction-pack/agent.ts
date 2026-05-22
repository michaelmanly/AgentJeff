import { z } from 'zod';
import { defineAgent, defineTool } from '@newatom/sdk';

const ResultSchema = z.object({
  category: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
  fields: z.record(z.string()),
  summary: z.string(),
});

const extractTool = defineTool({
  name: 'extract_fields',
  description: 'Submit structured extraction result',
  inputSchema: ResultSchema,
  outputSchema: ResultSchema,
  async execute(input) { return input; },
});

export const extractionAgent = defineAgent({
  name: 'extraction-agent',
  instructions: `You are a structured extraction agent. Classify, extract fields, and summarize any text.
Always call extract_fields with your result.`,
  inputSchema: z.object({ text: z.string() }),
  outputSchema: ResultSchema,
  tools: [extractTool],
  runtimeOptions: { maxSteps: 5 },
});
