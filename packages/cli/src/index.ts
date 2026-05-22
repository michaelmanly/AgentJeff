#!/usr/bin/env node
import { Command } from 'commander';
import { BadgrAdapter, executeRun } from '@agentjeff/sdk';
import { buildWorkspaceAgent } from '@agentjeff/examples';
import { extractionAgent } from '@agentjeff/examples';

const program = new Command();

program
  .name('newatom')
  .description('newatom agent runtime CLI')
  .version('0.1.0');

program
  .command('run:workspace')
  .description('Run the workspace assistant on a local directory')
  .argument('<path>', 'workspace path')
  .argument('[task]', 'task to perform', 'Summarize the repository structure.')
  .option('--events', 'show all events')
  .action(async (wsPath: string, task: string, opts: { events?: boolean }) => {
    const agent = buildWorkspaceAgent(wsPath);
    const run = await executeRun({
      agent,
      input: { task, path: wsPath },
      inferenceAdapter: new BadgrAdapter(),
      onEvent: opts.events
        ? (e) => console.log(`[${e.type}]`, JSON.stringify(e.payload).slice(0, 120))
        : undefined,
    });
    if (opts.events) console.log('\n--- Events ---', run.events.length);
    console.log('\n--- Result ---');
    console.log(run.result);
    console.log(`Status: ${run.status}`);
  });

program
  .command('run:extract')
  .description('Run structured extraction on text')
  .argument('<text>', 'text to extract from')
  .option('--events', 'show all events')
  .action(async (text: string, opts: { events?: boolean }) => {
    const run = await executeRun({
      agent: extractionAgent,
      input: { text },
      inferenceAdapter: new BadgrAdapter(),
      onEvent: opts.events
        ? (e) => console.log(`[${e.type}]`, JSON.stringify(e.payload).slice(0, 120))
        : undefined,
    });
    if (opts.events) console.log('\n--- Events ---', run.events.length);
    console.log('\n--- Extracted ---');
    console.log(JSON.stringify(run.result, null, 2));
    console.log(`Status: ${run.status}`);
  });

program.parse();
