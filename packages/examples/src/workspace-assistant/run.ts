import { BadgrAdapter, executeRun } from '@agentjeff/sdk';
import { buildWorkspaceAgent } from './agent';

async function main() {
  const workspacePath = process.argv[2] ?? '.';
  const task = process.argv[3] ?? 'Summarize the repository structure and list the main files.';

  const agent = buildWorkspaceAgent(workspacePath);
  const adapter = new BadgrAdapter();

  console.log(`Running workspace assistant on: ${workspacePath}`);
  console.log(`Task: ${task}\n`);

  const run = await executeRun({
    agent,
    input: { task, path: workspacePath },
    inferenceAdapter: adapter,
    onEvent: (e) => {
      console.log(`[${e.type}]`, JSON.stringify(e.payload).slice(0, 120));
    },
  });

  console.log('\n--- Result ---');
  console.log(run.result);
  console.log(`\nStatus: ${run.status} | Events: ${run.events.length}`);
}

main().catch(console.error);
