import type { ScenarioRecord } from '../../src/types.js';
import { generateId } from '../../src/utils/id.js';

export const edgeCaseScenarios: ScenarioRecord[] = [
  {
    id: generateId('scenario'),
    type: 'edge-case',
    description: 'Division by zero in calculator.divide()',
    generatedBy: 'static',
    model: 'none',
    novelty: 0.9,
    issueDiscoveryRate: 0.8,
    duplicateCount: 0,
    createdAt: Date.now(),
  },
  {
    id: generateId('scenario'),
    type: 'edge-case',
    description: 'Empty string in capitalize() causes charAt(0) on empty string',
    generatedBy: 'static',
    model: 'none',
    novelty: 0.8,
    issueDiscoveryRate: 0.7,
    duplicateCount: 0,
    createdAt: Date.now(),
  },
  {
    id: generateId('scenario'),
    type: 'edge-case',
    description: 'clamp() when min > max returns wrong value',
    generatedBy: 'static',
    model: 'none',
    novelty: 0.7,
    issueDiscoveryRate: 0.6,
    duplicateCount: 0,
    createdAt: Date.now(),
  },
  {
    id: generateId('scenario'),
    type: 'edge-case',
    description: 'countWords() returns 1 for empty string instead of 0',
    generatedBy: 'static',
    model: 'none',
    novelty: 0.75,
    issueDiscoveryRate: 0.65,
    duplicateCount: 0,
    createdAt: Date.now(),
  },
];
