import { run } from '@agentjeff/sdk';
import { agent } from './agent';

async function main() {
  const result = await run(
    agent,
    { name: 'World', style: 'casual' },
    {
      onEvent: (event) => {
        console.log(`[${event.type}]`, JSON.stringify(event.payload).slice(0, 80));
      },
    }
  );

  console.log('\nResult:', result.result);
  console.log('Status:', result.status);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
