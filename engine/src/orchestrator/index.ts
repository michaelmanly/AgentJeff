import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { EngineStatus, EngineMetrics, EngineState } from '../types.js';
import { EnvironmentLoop } from './environment-loop.js';
import { ImprovementLoop } from './improvement-loop.js';
import { OllamaAdapter } from '../adapters/ollama.js';
import { RepoAdapter } from '../adapters/repo/index.js';
import { Planner } from '../planner/index.js';
import { Builder } from '../builder/index.js';
import { Critic } from '../critic/index.js';
import { Verifier } from '../verifier/index.js';
import { Scorer } from '../scorer/index.js';
import { MemoryManager } from '../memory/index.js';
import { createInitialMetrics } from '../scorer/metrics.js';
import { createLogger } from '../utils/logger.js';
import { saveReport } from './report.js';
import { engineEvents } from '../utils/events.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger('Engine');

interface EngineSettings {
  cycleDelayMs: number;
  maxConcurrentWorkers: number;
  improvementIntervalIterations: number;
  maxAttemptsToReview: number;
  sandboxRepoPath: string;
  primaryModel: string;
  fastModel: string;
  defaultStrategy: string;
}

interface OllamaSettings {
  baseUrl: string;
  primaryModel: string;
  fastModel: string;
  temperature: number;
  maxTokens: number;
}

export class Engine {
  private status: EngineStatus = 'idle';
  private metrics: EngineMetrics = createInitialMetrics();
  private envLoop?: EnvironmentLoop;
  private improvementLoop?: ImprovementLoop;
  private stateFile: string;
  private memoryDir: string;
  private reportsDir: string;

  constructor() {
    const root = join(__dirname, '../..');
    this.stateFile = join(root, '.engine-state.json');
    this.memoryDir = join(root, 'memory');
    this.reportsDir = join(root, 'artifacts/reports');
  }

  private loadSettings(): { engine: EngineSettings; ollama: OllamaSettings } {
    const root = join(__dirname, '../..');
    const engineSettings = JSON.parse(
      readFileSync(join(root, 'config/engine-settings.json'), 'utf-8')
    ) as EngineSettings;
    const ollamaSettings = JSON.parse(
      readFileSync(join(root, 'config/ollama-settings.json'), 'utf-8')
    ) as OllamaSettings;
    return { engine: engineSettings, ollama: ollamaSettings };
  }

  async start(): Promise<void> {
    logger.info('Engine starting...');
    this.status = 'running';

    const { engine, ollama } = this.loadSettings();

    const repoPath = join(__dirname, '../..', engine.sandboxRepoPath);

    const primaryAdapter = new OllamaAdapter({
      model: ollama.primaryModel,
      baseUrl: ollama.baseUrl,
      temperature: ollama.temperature,
    });

    const fastAdapter = new OllamaAdapter({
      model: ollama.fastModel,
      baseUrl: ollama.baseUrl,
      temperature: ollama.temperature,
    });

    const available = await primaryAdapter.isAvailable();
    if (!available) {
      logger.warn(`Ollama model ${ollama.primaryModel} not available, will use fallback planning`);
    }

    const memory = new MemoryManager(this.memoryDir);
    const repo = new RepoAdapter(repoPath);
    const planner = new Planner(primaryAdapter, ollama.primaryModel);
    const builder = new Builder(primaryAdapter, ollama.primaryModel, repoPath);
    const critic = new Critic(fastAdapter, ollama.fastModel);
    const verifier = new Verifier(repoPath);
    const scorer = new Scorer();

    this.envLoop = new EnvironmentLoop(
      planner, builder, critic, verifier, scorer, memory, repo,
      engine.cycleDelayMs,
    );

    this.improvementLoop = new ImprovementLoop(memory, engine.improvementIntervalIterations);

    this.saveState();

    const shutdown = async () => {
      logger.info('Shutdown signal received');
      await this.stop();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    let cycleCount = 0;
    engineEvents.on('cycle.completed', async () => {
      cycleCount++;
      this.metrics.iterations = cycleCount;
      await this.improvementLoop!.runIfDue(cycleCount);
      
      if (cycleCount % 5 === 0) {
        const recentAttempts = await memory.getRecentAttempts(50);
        const scoreTrend = await memory.getScoreTrend();
        saveReport(this.metrics, recentAttempts, scoreTrend, this.reportsDir);
      }
    });

    logger.info('Engine started, entering environment loop');
    await this.envLoop.start();
  }

  pause(): void {
    this.status = 'paused';
    this.envLoop?.pause();
    this.saveState();
    logger.info('Engine paused');
  }

  async stop(): Promise<void> {
    this.status = 'stopped';
    this.envLoop?.stop();
    this.saveState();
    logger.info('Engine stopped');
  }

  async resume(): Promise<void> {
    if (this.status === 'paused') {
      this.status = 'running';
      this.envLoop?.resume();
      this.saveState();
      logger.info('Engine resumed');
    } else {
      await this.start();
    }
  }

  getMetrics(): EngineMetrics {
    return this.metrics;
  }

  getStatus(): EngineStatus {
    return this.status;
  }

  private saveState(): void {
    const state: EngineState = {
      status: this.status,
      pid: process.pid,
      startedAt: Date.now(),
      iterations: this.metrics.iterations,
      lastCycleAt: Date.now(),
    };
    try {
      writeFileSync(this.stateFile, JSON.stringify(state, null, 2), 'utf-8');
    } catch {
      // ignore
    }
  }
}
