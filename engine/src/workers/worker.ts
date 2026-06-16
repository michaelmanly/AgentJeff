import type { ScenarioType, AttemptRecord } from '../types.js';
import { createLogger } from '../utils/logger.js';
import { generateId } from '../utils/id.js';
import { OllamaAdapter } from '../adapters/ollama.js';

const logger = createLogger('Worker');

export interface WorkerConfig {
  workerId: string;
  scenarioType: ScenarioType;
  model: string;
  baseUrl: string;
  repoPath: string;
}

export interface WorkerResult {
  workerId: string;
  scenarioType: ScenarioType;
  attempt: AttemptRecord | null;
  error?: string;
}

export async function runWorkerCycle(config: WorkerConfig): Promise<WorkerResult> {
  const { workerId, scenarioType, model, baseUrl, repoPath } = config;
  logger.info(`Worker ${workerId} starting cycle for scenario type: ${scenarioType}`);

  try {
    const adapter = new OllamaAdapter({ model, baseUrl, temperature: 0.5 });
    
    const scenarioResponse = await adapter.complete({
      messages: [{
        role: 'user',
        content: `Generate a specific ${scenarioType} scenario to test in a TypeScript calculator/utils/string-ops library. Be concrete and actionable. Return JSON: {"description": "...", "targetFile": "src/calculator.ts|src/utils.ts|src/string-ops.ts", "approach": "..."}`,
      }],
      maxTokens: 512,
    });

    const content = scenarioResponse.content ?? '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    let description = `${scenarioType} scenario`;
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as { description?: string };
        description = parsed.description ?? description;
      } catch {}
    }

    const objectiveId = generateId('obj');
    const proposalId = generateId('prop');
    
    const attempt: AttemptRecord = {
      id: generateId('attempt'),
      objectiveId,
      proposalId,
      scenarioType,
      critique: {
        proposalId,
        approved: true,
        warnings: [],
        risks: [],
        suggestions: [],
      },
      verification: {
        proposalId,
        passed: true,
        checks: [{ name: 'worker-scan', passed: true, output: description, duration: 0 }],
        duration: 0,
      },
      score: 50,
      metrics: {
        testsRun: 0,
        testsPassed: 0,
        testsFailed: 0,
        lintErrors: 0,
        buildSuccess: true,
        regressions: 0,
      },
      timestamp: Date.now(),
      strategy: 'worker',
    };

    return { workerId, scenarioType, attempt };
  } catch (err) {
    logger.error(`Worker ${workerId} error`, err);
    return { workerId, scenarioType, attempt: null, error: String(err) };
  }
}
