import { BadgrAdapter, executeRun } from '@agentjeff/sdk';
import { extractionAgent } from './agent';

async function main() {
  const text = process.argv[2] ?? 'The login button does not work on mobile Safari. Users cannot sign in.';

  console.log(`Extracting from: "${text}"\n`);

  const run = await executeRun({
    agent: extractionAgent,
    input: { text },
    inferenceAdapter: new BadgrAdapter(),
    onEvent: (e) => {
      console.log(`[${e.type}]`, JSON.stringify(e.payload).slice(0, 120));
    },
  });

  console.log('\n--- Extracted ---');
  console.log(JSON.stringify(run.result, null, 2));
  console.log(`Status: ${run.status}`);
}

main().catch(console.error);
