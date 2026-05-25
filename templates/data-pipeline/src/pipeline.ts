import { Workflow } from '@agentjeff/workflow';

interface PipelineState {
  rawData?: Record<string, unknown>[];
  validRows?: Record<string, unknown>[];
  transformed?: string[];
  outputPath?: string;
}

export const pipeline = new Workflow<PipelineState>('data-pipeline')
  .step('fetch', async (state, _ctx) => {
    // Replace with a real data source: HTTP, DB, file read, etc.
    // const resp = await fetch('https://api.example.com/data');
    // const rawData = await resp.json();
    const rawData = [
      { id: 1, name: 'Alice', score: '92' },
      { id: 2, name: '', score: 'bad' },   // will be rejected in validate
      { id: 3, name: 'Bob', score: '75' },
    ];
    console.log(`  [fetch] loaded ${rawData.length} rows`);
    return { ...state, rawData };
  })
  .step('validate', async (state, _ctx) => {
    const validRows = (state.rawData ?? []).filter(
      (r) => r.name && !isNaN(Number(r.score))
    );
    const rejected = (state.rawData?.length ?? 0) - validRows.length;
    console.log(`  [validate] ${validRows.length} valid, ${rejected} rejected`);
    return { ...state, validRows };
  })
  .step('transform', async (state, _ctx) => {
    const transformed = (state.validRows ?? []).map(
      (r) => `${r.name}: score=${Number(r.score)}`
    );
    console.log(`  [transform] produced ${transformed.length} records`);
    return { ...state, transformed };
  })
  .step('store', async (state, _ctx) => {
    // Replace with a real write: DB insert, S3 upload, file write, etc.
    // await fs.writeFile('./output.json', JSON.stringify(state.transformed), 'utf-8');
    const outputPath = '/tmp/pipeline-output.json';
    console.log(`  [store] writing to ${outputPath}`);
    return { ...state, outputPath };
  });
