import { executeRun, BadgrAdapter } from '@agentjeff/sdk';
import { buildCodeReviewAgent } from './agent';
import path from 'path';

const target = process.argv[2] ?? '.';
const absPath = path.resolve(target);

async function main() {
  console.log(`Reviewing: ${absPath}\n`);

  const agent = buildCodeReviewAgent(absPath);
  const result = await executeRun({
    agent,
    input: { task: 'Review this codebase for issues', focusPath: absPath },
    inferenceAdapter: new BadgrAdapter(),
    onEvent: (e) => {
      if (e.type === 'tool.called') {
        const p = e.payload as { name: string; input: Record<string, unknown> };
        console.log(`  [${p.name}] ${JSON.stringify(p.input).slice(0, 70)}`);
      }
    },
  });

  const r = result.result as {
    summary: string;
    issueCount: number;
    recommendation: string;
  } | null;

  console.log('\n--- Review Summary ---');
  console.log(r?.summary);
  console.log(`\nIssues found: ${r?.issueCount ?? 'n/a'}`);
  console.log(`Recommendation: ${r?.recommendation ?? 'n/a'}`);
  console.log(`Status: ${result.status}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
