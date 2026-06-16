import fs from 'fs/promises';
import path from 'path';
import { EngineStatus, EngineState, EngineSettings, OllamaSettings, EngineMetrics } from '../types.js';
import { OllamaAdapter, FallbackAdapter } from '../adapters/ollama.js';
import { RepoAdapter } from '../adapters/repo/index.js';
import { TestRunnerAdapter } from '../adapters/tests/index.js';
import { MemoryManager } from '../memory/index.js';
import { Planner } from '../planner/index.js';
import { Builder } from '../builder/index.js';
import { Critic } from '../critic/index.js';
import { Verifier } from '../verifier/index.js';
import { Scorer } from '../scorer/index.js';
import { WorkerPool } from '../workers/index.js';
import { runEnvironmentCycle } from './environment-loop.js';
import { runImprovementCycle } from './improvement-loop.js';
import { generateReport } from './report.js';
import { emitEngineEvent } from '../utils/events.js';
import { emptyMetrics, updateMetrics } from '../scorer/metrics.js';
import { logger } from '../utils/logger.js';

const STATE_FILE = path.join(process.cwd(), '.engine-state.json');

export class Engine {
  private status: EngineStatus = 'idle';
  private iteration = 0;
  private metrics: EngineMetrics = emptyMetrics();
  private paused = false;
  private stopping = false;
  private startedAt = 0;

  private settings!: EngineSettings;
  private ollamaSettings!: OllamaSettings;
  private primaryAdapter!: OllamaAdapter | FallbackAdapter;
  private fastAdapter!: OllamaAdapter | FallbackAdapter;

  private memory!: MemoryManager;
  private repo!: RepoAdapter;
  private testRunner!: TestRunnerAdapter;
  private planner!: Planner;
  private builder!: Builder;
  private critic!: Critic;
  private verifier!: Verifier;
  private scorer!: Scorer;
  private workers!: WorkerPool;

  async start(): Promise<void> {
    this.startedAt = Date.now();
    await this.loadConfig();
    await this.initAdapters();
    await this.memory.initDefaultStrategies();
    await this.verifier.setBaseline();
    await this.saveState();

    this.status = 'running';
    emitEngineEvent('engine.started', { pid: process.pid });
    logger.info('Engine started');

    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());

    await this.runLoop();
  }

  async resume(): Promise<void> {
    await this.loadConfig();
    await this.initAdapters();

    const savedState = await this.loadState();
    if (savedState) {
      this.iteration = savedState.iteration;
      this.metrics = savedState.metrics;
      logger.info(`Resuming from iteration ${this.iteration}`);
    }

    await this.verifier.setBaseline();
    this.status = 'running';
    this.paused = false;
    this.stopping = false;
    await this.runLoop();
  }

  pause(): void {
    this.paused = true;
    this.status = 'paused';
    emitEngineEvent('engine.paused', {});
    logger.info('Engine paused');
  }

  async stop(): Promise<void> {
    if (this.stopping) return;
    this.stopping = true;
    this.status = 'stopped';
    emitEngineEvent('engine.stopped', { iteration: this.iteration });
    await this.saveState();
    logger.info(`Engine stopped at iteration ${this.iteration}`);
    await generateReport(this.memory, this.metrics);
    process.exit(0);
  }

  getStatus(): EngineStatus {
    return this.status;
  }

  getMetrics(): EngineMetrics {
    return { ...this.metrics };
  }

  private async runLoop(): Promise<void> {
    while (!this.stopping) {
      while (this.paused && !this.stopping) {
        await sleep(500);
      }
      if (this.stopping) break;

      const cycleStart = Date.now();
      this.iteration++;
      this.metrics.iterations++;

      try {
        // Run environment cycle (main loop) and workers in parallel
        const [cycleResult] = await Promise.allSettled([
          runEnvironmentCycle(
            this.iteration,
            this.planner,
            this.builder,
            this.critic,
            this.verifier,
            this.scorer,
            this.memory,
            this.repo,
            this.settings
          ),
          this.workers.runOnce(),
        ]);

        if (cycleResult.status === 'fulfilled') {
          const { score } = cycleResult.value;
          this.metrics.scoreTrend.push(score);
          if (this.metrics.scoreTrend.length > 100) this.metrics.scoreTrend.shift();
          if (!cycleResult.value.attempt.verification.passed) this.metrics.failures++;
          this.metrics.builderChangesAttempted++;
          if (cycleResult.value.attempt.verification.passed) this.metrics.builderChangesAccepted++;
          else this.metrics.builderChangesReverted++;
        } else {
          this.metrics.failures++;
          logger.error('Environment cycle failed', cycleResult.reason);
        }
      } catch (err) {
        this.metrics.failures++;
        logger.error('Loop error', err);
      }

      const cycleMs = Date.now() - cycleStart;
      this.metrics = updateMetrics(this.metrics, cycleMs);

      // Run improvement loop periodically
      if (this.iteration % this.settings.improvementIntervalIterations === 0) {
        try {
          await runImprovementCycle(this.memory);
          this.metrics.improvementVariantsTested++;
        } catch (err) {
          logger.warn('Improvement loop error', err);
        }
      }

      // Generate report every 20 iterations
      if (this.iteration % 20 === 0) {
        await generateReport(this.memory, this.metrics).catch(() => {});
      }

      await this.saveState();
      await sleep(this.settings.cycleDelayMs);
    }
  }

  private async loadConfig(): Promise<void> {
    const [settingsRaw, ollamaRaw] = await Promise.all([
      fs.readFile(path.join(process.cwd(), 'config', 'engine-settings.json'), 'utf-8'),
      fs.readFile(path.join(process.cwd(), 'config', 'ollama-settings.json'), 'utf-8'),
    ]);
    this.settings = JSON.parse(settingsRaw);
    this.ollamaSettings = JSON.parse(ollamaRaw);
  }

  private async initAdapters(): Promise<void> {
    const primaryOllama = new OllamaAdapter({
      model: this.ollamaSettings.primaryModel,
      baseUrl: this.ollamaSettings.baseUrl,
      temperature: this.ollamaSettings.temperature,
      maxTokens: this.ollamaSettings.maxTokens,
    });
    const fastOllama = new OllamaAdapter({
      model: this.ollamaSettings.fastModel,
      baseUrl: this.ollamaSettings.baseUrl,
      temperature: this.ollamaSettings.temperature,
      maxTokens: 1024,
    });

    const ollamaAvailable = await primaryOllama.isAvailable();
    if (ollamaAvailable) {
      logger.info(`Ollama available: ${this.ollamaSettings.primaryModel}`);
      this.primaryAdapter = primaryOllama;
      this.fastAdapter = fastOllama;
    } else {
      logger.warn('Ollama not available — using fallback rule-based adapter');
      this.primaryAdapter = new FallbackAdapter();
      this.fastAdapter = new FallbackAdapter();
    }

    const sandboxPath = path.resolve(process.cwd(), this.settings.sandboxRepoPath);
    this.repo = new RepoAdapter(sandboxPath);
    this.testRunner = new TestRunnerAdapter(sandboxPath);
    this.memory = new MemoryManager();

    this.planner = new Planner(this.primaryAdapter);
    this.builder = new Builder(this.primaryAdapter, this.repo);
    this.critic = new Critic(this.fastAdapter);
    this.verifier = new Verifier(this.testRunner, sandboxPath);
    this.scorer = new Scorer();
    this.workers = new WorkerPool(
      this.fastAdapter,
      this.repo,
      this.verifier,
      this.scorer,
      this.memory,
      this.settings.maxConcurrentWorkers
    );
  }

  private async saveState(): Promise<void> {
    const state: EngineState = {
      status: this.status,
      pid: process.pid,
      iteration: this.iteration,
      startedAt: this.startedAt,
      lastCycleAt: Date.now(),
      metrics: this.metrics,
    };
    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  }

  private async loadState(): Promise<EngineState | null> {
    try {
      const content = await fs.readFile(STATE_FILE, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
