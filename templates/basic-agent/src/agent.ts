import { z } from 'zod';
import { defineAgent, defineTool } from '@agentjeff/sdk';

const greetTool = defineTool({
  name: 'greet',
  description: 'Generate a greeting for a person',
  inputSchema: z.object({
    name: z.string().describe('The name to greet'),
    style: z.enum(['formal', 'casual']).default('casual'),
  }),
  outputSchema: z.object({ greeting: z.string() }),
  async execute({ name, style }) {
    const greeting = style === 'formal' ? `Good day, ${name}.` : `Hey ${name}!`;
    return { greeting };
  },
});

export const agent = defineAgent({
  name: 'greeter',
  instructions: `You are a friendly assistant. When asked to greet someone,
use the greet tool with the appropriate style, then confirm the greeting was sent.`,
  inputSchema: z.object({
    name: z.string(),
    style: z.enum(['formal', 'casual']).default('casual'),
  }),
  outputSchema: z.object({ message: z.string() }),
  tools: [greetTool],
  runtimeOptions: { maxSteps: 5 },
});
