import type { InferenceAdapter, Objective, RepoObservation, AttemptRecord, StrategyRecord, ScenarioType } from '../types.js';
import { buildPlannerPrompt } from './prompts.js';
import { createLogger } from '../utils/logger.js';
import { generateId } from '../utils/id.js';

const logger = createLogger('Planner');

const SCENARIO_TYPES: ScenarioType[] = [
  'edge-case', 'regression', 'performance', 'flaky-test',
  'adversarial-review', 'missing-test', 'unsafe-change', 'benchmark-degradation'
];

let roundRobinIdx = 0;

function fallbackObjective(): Objective {
  const type = SCENARIO_TYPES[roundRobinIdx % SCENARIO_TYPES.length];
  roundRobinIdx++;
  return {
    id: generateId('obj'),
    type,
    description: `Find and address ${type} issues in the sandbox repository`,
    priority: 5,
    createdAt: Date.now(),
  };
}

export class Planner {
  constructor(private adapter: InferenceAdapter, private model: string) {}

  async chooseObjective(
    observation: RepoObservation,
    recentAttempts: AttemptRecord[],
    strategy: StrategyRecord | null,
  ): Promise<Objective> {
    try {
      const prompt = buildPlannerPrompt(observation, recentAttempts, strategy);
      const response = await this.adapter.complete({
        messages: [{ role: 'user', content: prompt }],
        model: this.model,
        temperature: 0.4,
        maxTokens: 512,
      });

      const content = response.content ?? '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn('Planner returned no JSON, using fallback');
        return fallbackObjective();
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        type?: string;
        description?: string;
        priority?: number;
      };

      if (!parsed.type || !SCENARIO_TYPES.includes(parsed.type as ScenarioType)) {
        logger.warn(`Invalid scenario type: ${parsed.type}, using fallback`);
        return fallbackObjective();
      }

      return {
        id: generateId('obj'),
        type: parsed.type as ScenarioType,
        description: parsed.description ?? `Address ${parsed.type} issues`,
        priority: parsed.priority ?? 5,
        createdAt: Date.now(),
      };
    } catch (err) {
      logger.warn('Planner failed, using fallback', err);
      return fallbackObjective();
    }
  }
}
