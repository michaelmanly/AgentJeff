import { InferenceAdapter, Objective, RepoObservation, AttemptRecord, StrategyRecord, ScenarioType } from '../types.js';
import { buildObjectivePrompt } from './prompts.js';
import { newId } from '../utils/id.js';
import { logger } from '../utils/logger.js';

const SCENARIO_TYPES: ScenarioType[] = [
  'edge-case', 'regression', 'performance', 'flaky-test',
  'adversarial-review', 'missing-test', 'unsafe-change', 'benchmark-degradation',
];

export class Planner {
  private roundRobinIndex = 0;

  constructor(private adapter: InferenceAdapter) {}

  async chooseObjective(
    observation: RepoObservation,
    recentAttempts: AttemptRecord[],
    strategy: StrategyRecord | null
  ): Promise<Objective> {
    const prompt = buildObjectivePrompt(observation, recentAttempts, strategy);

    try {
      const response = await this.adapter.complete({
        messages: [
          { role: 'system', content: 'You choose the next engineering objective. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        maxTokens: 512,
      });

      const content = response.content ?? '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          id: parsed.id ?? `obj-${newId()}`,
          description: parsed.description ?? 'Improve code quality',
          type: (parsed.type as ScenarioType) ?? this.nextType(strategy),
          priority: parsed.priority ?? 5,
          targetFile: parsed.targetFile,
          createdAt: parsed.createdAt ?? Date.now(),
        };
      }
    } catch (err) {
      logger.warn('Planner LLM failed, using fallback', err);
    }

    return this.fallbackObjective(recentAttempts, strategy);
  }

  private nextType(strategy: StrategyRecord | null): ScenarioType {
    if (strategy) {
      const weighted: ScenarioType[] = [];
      for (const [type, weight] of Object.entries(strategy.scenarioWeights)) {
        for (let i = 0; i < weight; i++) weighted.push(type as ScenarioType);
      }
      if (weighted.length) {
        const type = weighted[this.roundRobinIndex % weighted.length];
        this.roundRobinIndex++;
        return type;
      }
    }
    const type = SCENARIO_TYPES[this.roundRobinIndex % SCENARIO_TYPES.length];
    this.roundRobinIndex++;
    return type;
  }

  private fallbackObjective(recentAttempts: AttemptRecord[], strategy: StrategyRecord | null): Objective {
    const recentTypes = new Set(recentAttempts.slice(-3).map((a) => a.scenarioType));
    const type = SCENARIO_TYPES.find((t) => !recentTypes.has(t)) ?? this.nextType(strategy);

    const descriptions: Record<ScenarioType, string> = {
      'edge-case': 'Find and handle edge cases in calculator functions (division by zero, overflow)',
      'regression': 'Add regression tests for recently changed functions',
      'performance': 'Identify performance bottlenecks in string operations',
      'flaky-test': 'Reproduce and fix any flaky test behavior',
      'adversarial-review': 'Review code for potential security or correctness issues',
      'missing-test': 'Add missing unit tests for uncovered code paths',
      'unsafe-change': 'Review for unsafe patterns or missing input validation',
      'benchmark-degradation': 'Check for benchmark degradation in utility functions',
    };

    return {
      id: `obj-${newId()}`,
      description: descriptions[type],
      type,
      priority: 5,
      targetFile: 'src/calculator.ts',
      createdAt: Date.now(),
    };
  }
}
