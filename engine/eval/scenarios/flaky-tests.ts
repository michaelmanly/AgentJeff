import type { ScenarioRecord } from '../../src/types.js';
import { generateId } from '../../src/utils/id.js';

export const flakyTestScenarios: ScenarioRecord[] = [
  {
    id: generateId('scenario'),
    type: 'flaky-test',
    description: 'Tests relying on timing or order could be flaky',
    generatedBy: 'static',
    model: 'none',
    novelty: 0.6,
    issueDiscoveryRate: 0.3,
    duplicateCount: 0,
    createdAt: Date.now(),
  },
];
