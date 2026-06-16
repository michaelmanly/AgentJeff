import { InferenceAdapter, ScenarioType, Proposal, FileChange } from '../types.js';
import { RepoAdapter } from '../adapters/repo/index.js';
import { Verifier } from '../verifier/index.js';
import { Scorer } from '../scorer/index.js';
import { MemoryManager } from '../memory/index.js';
import { newId } from '../utils/id.js';
import { logger } from '../utils/logger.js';

const SCENARIO_PROMPTS: Record<ScenarioType, string> = {
  'edge-case': 'Generate a test that catches an edge case (empty input, null, boundary values, overflow) in the calculator or utils module.',
  'regression': 'Generate a regression test for a function that could silently break with future changes.',
  'performance': 'Generate a test that verifies a function completes within a reasonable time limit.',
  'flaky-test': 'Generate a test that exposes potential flakiness (timing, state pollution, order dependency).',
  'adversarial-review': 'Generate a test for an adversarial input (malformed data, injection attempts, unicode edge cases).',
  'missing-test': 'Identify an untested code path and generate a test for it.',
  'unsafe-change': 'Detect an unsafe pattern in the code and generate a test that would catch it.',
  'benchmark-degradation': 'Generate a benchmark test that would detect performance degradation.',
};

export interface WorkerResult {
  workerId: number;
  scenarioType: ScenarioType;
  score: number;
  passed: boolean;
}

export class ScenarioWorker {
  constructor(
    private workerId: number,
    private adapter: InferenceAdapter,
    private repo: RepoAdapter,
    private verifier: Verifier,
    private scorer: Scorer,
    private memory: MemoryManager
  ) {}

  async runOnce(scenarioType: ScenarioType): Promise<WorkerResult> {
    logger.debug(`Worker ${this.workerId} generating ${scenarioType} scenario`);

    const proposal = await this.generateScenario(scenarioType);

    if (!proposal.changes.length) {
      return { workerId: this.workerId, scenarioType, score: 0, passed: false };
    }

    let applied = false;
    try {
      await this.repo.applyChanges(proposal.changes);
      applied = true;
    } catch {
      return { workerId: this.workerId, scenarioType, score: 0, passed: false };
    }

    const verification = await this.verifier.verify(proposal);

    if (applied && !verification.passed) {
      await this.repo.revertChanges(proposal.changes);
    }

    const metrics = this.scorer.extractMetrics(verification);
    const score = this.scorer.score(
      { proposalId: proposal.id, approved: true, warnings: [], risks: [], suggestions: [] },
      verification,
      metrics,
      0
    );

    await this.memory.saveAttempt({
      id: newId(),
      objectiveId: `worker-${this.workerId}-obj`,
      proposalId: proposal.id,
      scenarioType,
      critique: { proposalId: proposal.id, approved: true, warnings: [], risks: [], suggestions: [] },
      verification,
      score,
      metrics,
      timestamp: Date.now(),
      strategy: 'worker',
      workerIndex: this.workerId,
    });

    logger.debug(`Worker ${this.workerId} ${scenarioType}: score=${score} passed=${verification.passed}`);
    return { workerId: this.workerId, scenarioType, score, passed: verification.passed };
  }

  private async generateScenario(type: ScenarioType): Promise<Proposal> {
    const prompt = SCENARIO_PROMPTS[type];

    // Read current test files for context
    const contexts: string[] = [];
    for (const f of ['tests/calculator.test.ts', 'tests/utils.test.ts', 'tests/string-ops.test.ts']) {
      try {
        const content = await this.repo.readFile(f);
        contexts.push(`=== ${f} ===\n${content.slice(0, 800)}`);
      } catch {}
    }

    try {
      const response = await this.adapter.complete({
        messages: [
          {
            role: 'system',
            content: 'You generate targeted test cases. Return only valid JSON with a "changes" array.',
          },
          {
            role: 'user',
            content: `${prompt}\n\nExisting tests context:\n${contexts.join('\n')}\n\nReturn JSON: {"description":"...","changes":[{"path":"tests/new-scenario-${type}-${Date.now()}.test.ts","content":"<full test file>"}],"rationale":"..."}`,
          },
        ],
        temperature: 0.5,
        maxTokens: 1500,
      });

      const content = response.content ?? '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          id: `worker-prop-${newId()}`,
          objectiveId: `worker-${this.workerId}`,
          description: parsed.description ?? type,
          changes: (parsed.changes ?? []).map((c: any) => ({ path: c.path, content: c.content })),
          rationale: parsed.rationale ?? '',
          createdAt: Date.now(),
        };
      }
    } catch (err) {
      logger.debug(`Worker ${this.workerId} LLM failed`, err);
    }

    return { id: `worker-prop-${newId()}`, objectiveId: `worker-${this.workerId}`, description: type, changes: [], rationale: 'LLM failed', createdAt: Date.now() };
  }
}
