import fs from 'fs/promises';
import path from 'path';
import { Engine } from './orchestrator/index.js';
import { MemoryManager } from './memory/index.js';
import { generateReport } from './orchestrator/report.js';
import { emptyMetrics } from './scorer/metrics.js';
import { logger } from './utils/logger.js';

const STATE_FILE = path.join(process.cwd(), '.engine-state.json');

async function main() {
  const command = process.argv[2] ?? 'start';

  switch (command) {
    case 'start': {
      logger.info('Starting engine...');
      const engine = new Engine();
      await engine.start();
      break;
    }

    case 'resume': {
      logger.info('Resuming engine...');
      const engine = new Engine();
      await engine.resume();
      break;
    }

    case 'stop': {
      try {
        const stateRaw = await fs.readFile(STATE_FILE, 'utf-8');
        const state = JSON.parse(stateRaw);
        if (state.pid && state.pid !== process.pid) {
          process.kill(state.pid, 'SIGTERM');
          logger.info(`Sent SIGTERM to engine process ${state.pid}`);
        } else {
          logger.warn('No running engine found in state file');
        }
      } catch {
        logger.warn('Could not read engine state file');
      }
      break;
    }

    case 'pause': {
      try {
        const stateRaw = await fs.readFile(STATE_FILE, 'utf-8');
        const state = JSON.parse(stateRaw);
        if (state.pid) {
          process.kill(state.pid, 'SIGUSR1');
          logger.info(`Sent SIGUSR1 (pause) to engine process ${state.pid}`);
        }
      } catch {
        logger.warn('Could not read engine state file');
      }
      break;
    }

    case 'metrics': {
      try {
        const stateRaw = await fs.readFile(STATE_FILE, 'utf-8');
        const state = JSON.parse(stateRaw);
        console.log('\n=== Engine Metrics ===');
        console.log(`Status: ${state.status}`);
        console.log(`PID: ${state.pid}`);
        console.log(`Iteration: ${state.iteration}`);
        console.log(`Started: ${new Date(state.startedAt).toISOString()}`);
        console.log(`Last cycle: ${new Date(state.lastCycleAt).toISOString()}`);
        console.log('\nMetrics:');
        console.log(JSON.stringify(state.metrics, null, 2));
      } catch {
        logger.warn('No engine state found. Is the engine running?');
      }
      break;
    }

    case 'report': {
      const memory = new MemoryManager();
      const metrics = emptyMetrics();
      try {
        const stateRaw = await fs.readFile(STATE_FILE, 'utf-8');
        const state = JSON.parse(stateRaw);
        Object.assign(metrics, state.metrics ?? {});
      } catch {}
      const report = await generateReport(memory, metrics);
      console.log(report);
      break;
    }

    default: {
      console.log(`Usage: npm run <command>
Commands:
  start   - Start the engine
  resume  - Resume from last checkpoint
  stop    - Stop the running engine
  pause   - Pause the running engine
  metrics - Show current metrics
  report  - Generate and print a report`);
    }
  }
}

main().catch((err) => {
  logger.error('Fatal error', err);
  process.exit(1);
});
