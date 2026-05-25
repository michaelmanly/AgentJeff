#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { BadgrAdapter, executeRun } from '@agentjeff/sdk';
import { buildWorkspaceAgent, extractionAgent, researchAgent } from '@agentjeff/examples';
import {
  fmt,
  printEvent,
  printHeader,
  printResult,
  printStatus,
  printError,
  printSuccess,
  startSpinner,
  stopSpinner,
} from './formatter';
import { TEMPLATES, getTemplate } from './templates/index';

const program = new Command();

program
  .name('agentjeff')
  .description('Run agents, scaffold projects, and stream events from the terminal')
  .version('0.1.0');

// ─── run:workspace ────────────────────────────────────────────────────────────

program
  .command('run:workspace')
  .description('Run the workspace assistant on a local directory')
  .argument('<path>', 'workspace path')
  .argument('[task]', 'task to perform', 'Summarize the repository structure.')
  .option('--events', 'stream all events')
  .option('--model <model>', 'model to use (default: gpt-4o)')
  .action(async (wsPath: string, task: string, opts: { events?: boolean; model?: string }) => {
    const absPath = path.resolve(wsPath);
    printHeader(`Workspace Assistant  ${fmt.dim(absPath)}`);
    console.log(`  ${fmt.dim('Task:')} ${task}\n`);

    const agent = buildWorkspaceAgent(absPath);
    const startMs = Date.now();

    try {
      if (!opts.events) startSpinner('Running');
      const runResult = await executeRun({
        agent,
        input: { task, path: absPath },
        inferenceAdapter: new BadgrAdapter(opts.model ? { model: opts.model } : {}),
        onEvent: opts.events ? (e) => printEvent(e.type, e.payload) : undefined,
      });
      stopSpinner(runResult.status === 'completed');

      const wsResult = runResult.result as { summary?: string } | null;
      printResult('Summary', wsResult?.summary ?? runResult.result);
      printStatus(runResult.status, Date.now() - startMs);
    } catch (err: unknown) {
      stopSpinner(false);
      const msg = err instanceof Error ? err.message : String(err);
      printError('Agent run failed', diagnoseCLIError(msg));
      process.exit(1);
    }
  });

// ─── run:extract ──────────────────────────────────────────────────────────────

program
  .command('run:extract')
  .description('Run structured extraction on text (classifies, extracts fields, sets priority)')
  .argument('<text>', 'text to extract from')
  .option('--events', 'stream all events')
  .option('--model <model>', 'model to use')
  .action(async (text: string, opts: { events?: boolean; model?: string }) => {
    printHeader('Structured Extraction');
    console.log(`  ${fmt.dim('Input:')} ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}\n`);

    const startMs = Date.now();
    try {
      if (!opts.events) startSpinner('Extracting');
      const runResult = await executeRun({
        agent: extractionAgent,
        input: { text },
        inferenceAdapter: new BadgrAdapter(opts.model ? { model: opts.model } : {}),
        onEvent: opts.events ? (e) => printEvent(e.type, e.payload) : undefined,
      });
      stopSpinner(runResult.status === 'completed');

      printResult('Extracted', runResult.result);
      printStatus(runResult.status, Date.now() - startMs);
    } catch (err: unknown) {
      stopSpinner(false);
      const msg = err instanceof Error ? err.message : String(err);
      printError('Extraction failed', diagnoseCLIError(msg));
      process.exit(1);
    }
  });

// ─── run:research ─────────────────────────────────────────────────────────────

program
  .command('run:research')
  .description('Research a topic and produce a structured report')
  .argument('<topic>', 'topic to research')
  .option('--events', 'stream all events')
  .option('--depth <depth>', 'research depth: brief or thorough', 'brief')
  .option('--model <model>', 'model to use')
  .action(
    async (
      topic: string,
      opts: { events?: boolean; depth?: 'brief' | 'thorough'; model?: string }
    ) => {
      printHeader(`Research: ${fmt.cyan(topic)}`);
      console.log(`  ${fmt.dim('Depth:')} ${opts.depth ?? 'brief'}\n`);

      const startMs = Date.now();
      try {
        if (!opts.events) startSpinner('Researching');
        const runResult = await executeRun({
          agent: researchAgent,
          input: { topic, depth: opts.depth ?? 'brief' },
          inferenceAdapter: new BadgrAdapter(opts.model ? { model: opts.model } : {}),
          onEvent: opts.events ? (e) => printEvent(e.type, e.payload) : undefined,
        });
        stopSpinner(runResult.status === 'completed');

        const r = runResult.result as { summary: string; findingCount: number } | null;
        printResult('Report', r?.summary ?? runResult.result);
        if (r?.findingCount !== undefined) {
          console.log(`\n  ${fmt.dim('Findings:')} ${r.findingCount}`);
        }
        printStatus(runResult.status, Date.now() - startMs);
      } catch (err: unknown) {
        stopSpinner(false);
        const msg = err instanceof Error ? err.message : String(err);
        printError('Research failed', diagnoseCLIError(msg));
        process.exit(1);
      }
    }
  );

// ─── templates ────────────────────────────────────────────────────────────────

program
  .command('templates')
  .description('List all available starter templates')
  .action(() => {
    printHeader('Starter Templates');
    console.log(`  ${fmt.dim('Usage:')} agentjeff init <template> [dir]\n`);
    for (const t of TEMPLATES) {
      console.log(`  ${fmt.bold(fmt.cyan(t.name))}`);
      console.log(`  ${fmt.dim(t.description)}\n`);
    }
    console.log(fmt.dim('  Run `agentjeff init --help` for options.'));
  });

// ─── init ─────────────────────────────────────────────────────────────────────

program
  .command('init')
  .description('Scaffold a new agent project from a starter template')
  .argument('[template]', 'template name (run `agentjeff templates` to list options)')
  .argument('[dir]', 'output directory (default: ./<template-name>)')
  .option('--list', 'list available templates and exit')
  .action(async (templateName: string | undefined, dirArg: string | undefined, opts: { list?: boolean }) => {
    if (opts.list || !templateName) {
      printHeader('Available Templates');
      for (const t of TEMPLATES) {
        console.log(`  ${fmt.bold(t.name.padEnd(18))} ${fmt.dim(t.description)}`);
      }
      console.log(`\n  ${fmt.dim('Example:')} agentjeff init basic-agent`);
      return;
    }

    const template = getTemplate(templateName);
    if (!template) {
      printError(
        `Unknown template: "${templateName}"`,
        `Available: ${TEMPLATES.map((t) => t.name).join(', ')}`
      );
      process.exit(1);
    }

    const outDir = path.resolve(dirArg ?? `./${template.name}`);

    // Check if directory already exists and is not empty
    try {
      const existing = await fs.readdir(outDir);
      if (existing.length > 0) {
        printError(
          `Directory already exists and is not empty: ${outDir}`,
          'Choose a different directory or delete the existing one.'
        );
        process.exit(1);
      }
    } catch {
      // Directory does not exist — that's fine, we'll create it
    }

    printHeader(`Scaffolding ${fmt.cyan(template.name)}`);
    console.log(`  ${fmt.dim('Target:')} ${outDir}\n`);

    for (const file of template.files) {
      const dest = path.join(outDir, file.path);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, file.content, 'utf-8');
      console.log(`  ${fmt.green('+')} ${file.path}`);
    }

    console.log(`\n${fmt.bold('Next steps:')}`);
    console.log(`\n  ${fmt.cyan(`cd ${path.relative(process.cwd(), outDir) || '.'}`)}`)
    console.log(`  ${fmt.cyan('cp .env.example .env')}  ${fmt.dim('# add your BADGR_API_KEY')}`);
    console.log(`  ${fmt.cyan('npm install')}`);
    console.log(`  ${fmt.cyan('npm start')}\n`);
    printSuccess(`Project ready. Docs: https://github.com/michaelmanly/agentjeff`);
  });

// ─── Error helpers ────────────────────────────────────────────────────────────

function diagnoseCLIError(msg: string): string {
  if (msg.includes('BADGR_API_KEY') || msg.includes('401') || msg.includes('Unauthorized')) {
    return 'Set BADGR_API_KEY in your environment. Get a key at https://aibadgr.com';
  }
  if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
    return 'Network error — check your internet connection or BADGR_BASE_URL.';
  }
  if (msg.includes('ENOENT')) {
    return 'Path not found — check the workspace path argument.';
  }
  if (msg.includes('maxSteps')) {
    return 'Agent hit maxSteps limit. Pass --model or increase runtimeOptions.maxSteps.';
  }
  return msg;
}

program.parse();
