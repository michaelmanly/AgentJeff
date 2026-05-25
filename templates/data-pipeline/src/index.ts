import { pipeline } from './pipeline';

async function main() {
  console.log('Running data pipeline...\n');

  const result = await pipeline.run({});

  console.log('\n--- Pipeline Complete ---');
  console.log('Output:', result.outputPath);
  console.log('Records:', result.transformed?.length ?? 0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
