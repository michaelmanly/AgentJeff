import { EngineSettings, AttemptRecord } from '../types.js';
import { Planner } from '../planner/index.js';
import { Builder } from '../builder/index.js';
import { Critic } from '../critic/index.js';
import { Verifier } from '../verifier/index.js';
import { Scorer } from '../scorer/index.js';
import { MemoryManager } from '../memory/index.js';
import { RepoAdapter } from '../adapters/repo/index.js';
import { emitEngineEvent } from '../utils/events.js';
import { newId } from '../utils/id.js';
import { logger } from '../utils/logger.js';

export async function runEnvironmentCycle(
  iteration: number,
  planner: Planner,
  builder: Builder,
  critic: Critic,
  verifier: Verifier,
  scorer: Scorer,
  memory: MemoryManager,
  repo: RepoAdapter,
  settings: EngineSettings
): Promise<{ score: number; attempt: AttemptRecord }> {
  const cycleStart = Date.now();
  emitEngineEvent('cycle.started', { iteration });

  // 1. Observe
  const observation = await repo.observe();

  // 2. Choose objective
  const [recentAttempts, bestStrategy] = await Promise.all([
    memory.getRecentAttempts(20),
    memory.getBestStrategy(),
  ]);

  const objective = await planner.chooseObjective(observation, recentAttempts, bestStrategy);
  emitEngineEvent('objective.chosen', { objective });
  logger.info(`[Iter ${iteration}] Objective: ${objective.type} - ${objective.description}`);

  // 3. Generate proposal
  const proposal = await builder.generateProposal(objective);
  emitEngineEvent('proposal.generated', { proposalId: proposal.id, changes: proposal.changes.length });

  // 4. Critique
  const critique = await critic.critiqueProposal(proposal);
  emitEngineEvent('critique.done', { approved: critique.approved, warnings: critique.warnings.length });

  if (!critique.approved) {
    logger.warn(`[Iter ${iteration}] Critique rejected: ${critique.risks.join('; ')}`);
    const attempt: AttemptRecord = {
      id: newId(),
      objectiveId: objective.id,
      proposalId: proposal.id,
      scenarioType: objective.type,
      critique,
      verification: { proposalId: proposal.id, passed: false, checks: [], duration: 0 },
      score: 0,
      metrics: { testsRun: 0, testsPassed: 0, testsFailed: 0, lintErrors: 0, buildSuccess: false, regressions: 0 },
      timestamp: Date.now(),
      strategy: bestStrategy?.name ?? 'default',
    };
    await memory.saveAttempt(attempt);
    emitEngineEvent('cycle.completed', { iteration, score: 0, passed: false });
    return { score: 0, attempt };
  }

  // 5. Apply changes
  let applied = false;
  if (proposal.changes.length > 0) {
    try {
      await repo.applyChanges(proposal.changes);
      applied = true;
    } catch (err) {
      logger.error('Failed to apply changes', err);
    }
  }

  // 6. Verify
  const verification = await verifier.verify(proposal);
  emitEngineEvent('verification.done', { passed: verification.passed, checks: verification.checks.length });

  // 7. Revert if failed
  if (applied && !verification.passed) {
    await repo.revertChanges(proposal.changes);
    logger.warn(`[Iter ${iteration}] Verification failed, reverted changes`);
  }

  // 8. Score
  const metrics = scorer.extractMetrics(verification);
  const cycleMs = Date.now() - cycleStart;
  const score = scorer.score(critique, verification, metrics, cycleMs);

  // 9. Save memory
  const attempt: AttemptRecord = {
    id: newId(),
    objectiveId: objective.id,
    proposalId: proposal.id,
    scenarioType: objective.type,
    critique,
    verification,
    score,
    metrics,
    timestamp: Date.now(),
    strategy: bestStrategy?.name ?? 'default',
  };
  await memory.saveAttempt(attempt);

  emitEngineEvent('score.recorded', { score, iteration });
  emitEngineEvent('cycle.completed', { iteration, score, passed: verification.passed });
  logger.info(`[Iter ${iteration}] Score: ${score} | Passed: ${verification.passed} | Cycle: ${cycleMs}ms`);

  return { score, attempt };
}
