import type { ScenarioRecord } from '../../src/types.js';
import { generateId } from '../../src/utils/id.js';

export const regressionScenarios: ScenarioRecord[] = [
  {
    id: generateId('scenario'),
    type: 'regression',
    description: 'Ensure add() still returns correct sum after refactoring',
    generatedBy: 'static',
    model: 'none',
    novelty: 0.5,
    issueDiscoveryRate: 0.4,
    duplicateCount: 0,
    createdAt: Date.now(),
  },
  {
    id: generateId('scenario'),
    type: 'regression',
    description: 'Verify unique() still deduplicates after changes to utils',
    generatedBy: 'static',
    model: 'none',
    novelty: 0.5,
    issueDiscoveryRate: 0.4,
    duplicateCount: 0,
    createdAt: Date.now(),
  },
];
