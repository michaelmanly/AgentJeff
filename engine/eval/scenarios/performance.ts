import type { ScenarioRecord } from '../../src/types.js';
import { generateId } from '../../src/utils/id.js';

export const performanceScenarios: ScenarioRecord[] = [
  {
    id: generateId('scenario'),
    type: 'performance',
    description: 'range() with large bounds should be efficient',
    generatedBy: 'static',
    model: 'none',
    novelty: 0.6,
    issueDiscoveryRate: 0.3,
    duplicateCount: 0,
    createdAt: Date.now(),
  },
];
