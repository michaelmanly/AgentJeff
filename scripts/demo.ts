// Run with: npm run demo — no API key required
import { z } from 'zod';
import { defineAgent, defineTool, run } from '@agentjeff/sdk';
import { MockInferenceAdapter } from '@agentjeff/testing';

const lookupTool = defineTool({
  name: 'lookup',
  description: 'Look up information on a topic',
  inputSchema: z.object({ topic: z.string() }),
  outputSchema: z.object({ facts: z.array(z.string()) }),
  async execute({ topic }) {
    return {
      facts: [
        `AgentJeff drives the infer → tool → state loop for you.`,
        `Tools (${topic}): define with Zod schemas; the runtime validates and dispatches.`,
        `Use MockInferenceAdapter for tests — no LLM needed.`,
      ],
    };
  },
});

const agent = defineAgent({
  name: 'researcher',
  instructions: 'Answer the question by looking up facts first, then summarize.',
  inputSchema: z.object({ question: z.string() }),
  outputSchema: z.string(),
  tools: [lookupTool],
});

async function main() {
  console.log('AgentJeff demo — mock adapter, no API key required\n');

  const agentRun = await run(
    agent,
    { question: 'How does AgentJeff handle the run loop?' },
    {
      adapter: new MockInferenceAdapter([
        {
          content: null,
          toolCalls: [{ id: 'tc1', name: 'lookup', arguments: { topic: 'run loop' } }],
        },
        {
          content: 'AgentJeff owns the loop. You define tools — the runtime drives infer, dispatch, and state.',
          toolCalls: [],
        },
      ]),
      onEvent: (e) => {
        const detail = JSON.stringify(e.payload).slice(0, 90);
        console.log(`  [${e.type.padEnd(18)}] ${detail}`);
      },
    }
  );

  console.log('\nResult:', agentRun.result);
  console.log(
    `Status:  ${agentRun.status} | Steps: ${agentRun.events.filter((e) => e.type === 'state.updated').length} | Events: ${agentRun.events.length}`
  );
  console.log('\nNext: npm run test:scenarios');
}

main().catch(console.error);
