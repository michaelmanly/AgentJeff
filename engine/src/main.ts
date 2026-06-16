import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Engine } from './orchestrator/index.js';
import type { EngineState } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const stateFile = join(__dirname, '../.engine-state.json');

function loadState(): EngineState | null {
  if (!existsSync(stateFile)) return null;
  try {
    return JSON.parse(readFileSync(stateFile, 'utf-8')) as EngineState;
  } catch {
    return null;
  }
}

async function main() {
  const command = process.argv[2] ?? 'start';

  switch (command) {
    case 'start': {
      const engine = new Engine();
      await engine.start();
      break;
    }

    case 'pause': {
      const state = loadState();
      if (!state || state.status !== 'running') {
        console.log('Engine is not running');
        process.exit(1);
      }
      try {
        process.kill(state.pid, 'SIGUSR1');
        console.log(`Sent pause signal to engine (pid ${state.pid})`);
      } catch {
        console.log('Could not signal engine process');
      }
      break;
    }

    case 'stop': {
      const state = loadState();
      if (!state) {
        console.log('No running engine found');
        process.exit(1);
      }
      try {
        process.kill(state.pid, 'SIGTERM');
        console.log(`Sent stop signal to engine (pid ${state.pid})`);
      } catch {
        console.log('Could not signal engine process');
      }
      break;
    }

    case 'resume': {
      const engine = new Engine();
      await engine.resume();
      break;
    }

    case 'metrics': {
      const state = loadState();
      if (!state) {
        console.log('No engine state found. Has the engine been started?');
        process.exit(1);
      }
      console.log('Engine State:');
      console.log(JSON.stringify(state, null, 2));
      break;
    }

    default:
      console.log(`Unknown command: ${command}`);
      console.log('Usage: tsx src/main.ts [start|pause|stop|resume|metrics]');
      process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
