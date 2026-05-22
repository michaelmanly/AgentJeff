// Run with: npm run demo — no API key required
import { z } from 'zod';
import { defineAgent, defineTool, run, type InferenceAdapter } from 'agentjeff';

const lookupTool = defineTool({
  name: 'lookup',
  description: 'Look up information on a topic',
  inputSchema: z.object({ topic: z.string() }),
  outputSchema: z.object({ facts: z.array(z.string()) }),
  async execute({ topic }) {
    return {
      facts: [
        'AgentJeff drives the infer → tool → state loop for you.',
        `Tools (${topic}) are typed with Zod and validated before execution.`,
      ],
    };
  },
});

const agent = defineAgent({
  name: 'researcher',
  instructions: 'Answer the question by calling lookup first, then summarize.',
  inputSchema: z.object({ question: z.string() }),
  outputSchema: z.string(),
  tools: [lookupTool],
});

const mockAdapter: InferenceAdapter = {
  async complete({ messages }) {
    const hasToolResult = messages.some((m) => m.role === 'assistant' && m.content.includes('Tool lookup returned'));
    if (!hasToolResult) {
      return {
        content: null,
        toolCalls: [{ id: 'tc1', name: 'lookup', arguments: { topic: 'run loop' } }],
      };
    }
    return {
      content: 'AgentJeff owns the loop while your typed tools handle business logic.',
      toolCalls: [],
    };
  },
};

async function main() {
  console.log('AgentJeff demo — mock adapter, no API key required\n');
  const agentRun = await run(agent, { question: 'How does AgentJeff handle the run loop?' }, {
    adapter: mockAdapter,
    onEvent: (e) => console.log(`[${e.type}] ${JSON.stringify(e.payload)}`),
  });
  console.log('\nResult:', agentRun.result);
}

main().catch(console.error);
