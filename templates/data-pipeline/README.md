# data-pipeline

A multi-stage data pipeline using `Workflow`: fetch → validate → transform → store.

No LLM required. Each step is a plain async function that receives and returns state.

## Get started

```bash
npm install
npm start
```

## What it does

```
fetch      — load raw data (HTTP, DB, file, queue)
validate   — filter out bad rows
transform  — reshape data into the output format
store      — write to destination (DB, S3, file)
```

## Add an AI step

```typescript
import { executeRun, BadgrAdapter } from '@agentjeff/sdk';
import { classifyAgent } from './classify-agent';

.step('classify', async (state, _ctx) => {
  const result = await executeRun({
    agent: classifyAgent,
    input: { rows: state.validRows },
    inferenceAdapter: new BadgrAdapter(),
  });
  return { ...state, classified: result.result };
})
```

## Replace the stubs

Each step has a comment showing where to add a real implementation:

- **fetch** — `fetch()`, `pg.query()`, `fs.readFile()`, SQS `receiveMessage`
- **store** — `pg.query()`, `s3.putObject()`, `fs.writeFile()`, Kafka `produce`
