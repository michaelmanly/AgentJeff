import { run } from '@agentjeff/sdk';
import { researchAgent } from './agent';

const topic = process.argv[2] ?? 'TypeScript type inference';

async function main() {
  console.log(`Researching: "${topic}"\n`);

  const result = await run(
    researchAgent,
    { topic },
    {
      onEvent: (e) => {
        if (e.type === 'tool.called') {
          const p = e.payload as { name: string; input: Record<string, unknown> };
          console.log(`  → ${p.name}(${JSON.stringify(p.input).slice(0, 60)})`);
        }
      },
    }
  );

  const r = result.result as { summary: string; findingCount: number } | null;
  console.log('\n--- Research Report ---');
  console.log(r?.summary ?? result.result);
  console.log(`\nFindings recorded: ${r?.findingCount ?? 'n/a'}`);
  console.log(`Status: ${result.status}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
