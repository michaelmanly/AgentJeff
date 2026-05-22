import { z } from 'zod';
import { defineAgent, defineTool } from '@newatom/sdk';

const ExtractedSchema = z.object({
  category: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
  fields: z.record(z.string()),
  summary: z.string(),
});

const extractFieldsTool = defineTool({
  name: 'extract_fields',
  description: 'Extract structured fields from the analyzed text',
  inputSchema: z.object({
    category: z.string(),
    priority: z.enum(['low', 'medium', 'high']),
    fields: z.record(z.string()),
    summary: z.string(),
  }),
  outputSchema: ExtractedSchema,
  async execute(input, _ctx) {
    return input;
  },
});

export const extractionAgent = defineAgent({
  name: 'structured-extraction',
  instructions: `You are a structured extraction agent. Given raw text, you:
1. Classify it into a category (e.g. bug_report, feature_request, question, feedback)
2. Assign a priority: low, medium, or high
3. Extract key fields as key-value pairs
4. Write a one-sentence summary

Always call extract_fields with your result.`,
  inputSchema: z.object({ text: z.string() }),
  outputSchema: ExtractedSchema,
  tools: [extractFieldsTool],
  runtimeOptions: { maxSteps: 5 },
});
