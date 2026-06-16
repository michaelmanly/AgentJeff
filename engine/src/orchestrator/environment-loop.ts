import type { AttemptRecord } from '../types.js';
import type { Planner } from '../planner/index.js';
import type { Builder } from '../builder/index.js';
import type { Critic } from '../critic/index.js';
import type { Verifier } from '../verifier/index.js';
import type { Scorer } from '../scorer/index.js';
import type { MemoryManager } from '../memory/index.js';
import type { RepoAdapter } from '../adapters/repo/index.js';
import { createLogger } from '../utils/logger.js';
import { generateId } from '../utils/id.js';
import { engineEvents } from '../utils/events.js';

const logger = createLogger('EnvironmentLoop');

export class EnvironmentLoop {
  private running = false;
  private paused = false;
  private cycleCount = 0;

  constructor(
    private planner: Planner,
    private builder: Builder,
    private critic: Critic,
    private verifier: Verifier,
    private scorer: Scorer,
    private memory: MemoryManager,
    private repo: RepoAdapter,
    private cycleDelayMs: number,
  ) {}

  async start(): Promise<void> {
    this.running = true;
    this.paused = false;
    logger.info('Environment loop starting');

    while (this.running) {
      if (this.paused) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      const cycleStart = Date.now();
      engineEvents.emit('cycle.started', { cycleCount: this.cycleCount });

      try {
        await this.runCycle();
      } catch (err) {
        logger.error('Cycle error', err);
      }

      this.cycleCount++;
      engineEvents.emit('cycle.completed', { cycleCount: this.cycleCount, duration: Date.now() - cycleStart });

      if (this.running && !this.paused) {
        await new Promise(resolve => setTimeout(resolve, this.cycleDelayMs));
      }
    }

    logger.info('Environment loop stopped');
  }

  private async runCycle(): Promise<void> {
    logger.info(`Starting cycle ${this.cycleCount}`);

    const observation = await this.repo.observe();

    const recentAttempts = await this.memory.getRecentAttempts(10);
    const strategy = await this.memory.getBestStrategy();
    const objective = await this.planner.chooseObjective(observation, recentAttempts, strategy);
    engineEvents.emit('objective.chosen', { objective });
    logger.info(`Objective: [${objective.type}] ${objective.description}`);

    const proposal = await this.builder.generateProposal(objective, observation);
    engineEvents.emit('proposal.generated', { proposal });
    logger.info(`Proposal: ${proposal.description} (${proposal.changes.length} changes)`);

    const critique = await this.critic.critiqueProposal(proposal, observation);
    engineEvents.emit('critique.done', { critique });
    logger.info(`Critique: ${critique.approved ? 'APPROVED' : 'REJECTED'}`);

    if (!critique.approved) {
      logger.info('Proposal rejected by critic, skipping execution');
      const attempt: AttemptRecord = {
        id: generateId('attempt'),
        objectiveId: objective.id,
        proposalId: proposal.id,
        scenarioType: objective.type,
        critique,
        verification: {
          proposalId: proposal.id,
          passed: false,
          checks: [{ name: 'critic-rejected', passed: false, output: critique.warnings.join('; '), duration: 0 }],
          duration: 0,
        },
        score: 0,
        metrics: { testsRun: 0, testsPassed: 0, testsFailed: 0, lintErrors: 0, buildSuccess: false, regressions: 0 },
        timestamp: Date.now(),
        strategy: strategy?.name ?? 'balanced',
      };
      await this.memory.saveAttempt(attempt);
      return;
    }

    let changesApplied = false;
    if (proposal.changes.length > 0) {
      await this.repo.applyChanges(proposal.changes);
      changesApplied = true;
    }

    const verification = await this.verifier.verify(proposal);
    engineEvents.emit('verification.done', { verification });
    logger.info(`Verification: ${verification.passed ? 'PASSED' : 'FAILED'}`);

    if (!verification.passed && changesApplied) {
      logger.info('Verification failed, reverting changes');
      await this.repo.revertChanges(proposal.changes);
    }

    const metrics = this.scorer.extractAttemptMetrics(verification);
    const { score } = this.scorer.score(critique, verification, undefined, metrics);
    engineEvents.emit('score.recorded', { score });
    logger.info(`Score: ${score}`);

    const attempt: AttemptRecord = {
      id: generateId('attempt'),
      objectiveId: objective.id,
      proposalId: proposal.id,
      scenarioType: objective.type,
      critique,
      verification,
      score,
      metrics,
      timestamp: Date.now(),
      strategy: strategy?.name ?? 'balanced',
    };
    await this.memory.saveAttempt(attempt);
  }

  pause(): void {
    this.paused = true;
    engineEvents.emit('engine.paused', {});
    logger.info('Loop paused');
  }

  resume(): void {
    this.paused = false;
    logger.info('Loop resumed');
  }

  stop(): void {
    this.running = false;
    engineEvents.emit('engine.stopped', {});
    logger.info('Loop stop requested');
  }

  getCycleCount(): number {
    return this.cycleCount;
  }
}
