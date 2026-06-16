import { RepoObservation, AttemptRecord, StrategyRecord, ScenarioType } from '../types.js';

export function buildObjectivePrompt(
  observation: RepoObservation,
  recentAttempts: AttemptRecord[],
  strategy: StrategyRecord | null
): string {
  const recentSummary = recentAttempts.slice(-5).map((a) => ({
    type: a.scenarioType,
    score: a.score,
    passed: a.verification.passed,
  }));

  const weights = strategy?.scenarioWeights ?? {};
  const weightedTypes = Object.entries(weights)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .map(([type, w]) => `${type}(weight:${w})`)
    .join(', ');

  return `You are an autonomous engineering engine choosing the next testing objective.

Current repo state:
- Files: ${observation.files.join(', ')}
- Git status: ${observation.gitStatus || 'clean'}
- Recent commits: ${observation.recentCommits.join(', ') || 'none'}

Recent attempts (last 5):
${JSON.stringify(recentSummary, null, 2)}

Strategy weights: ${weightedTypes}

Choose the single most valuable next objective. Return ONLY valid JSON matching this schema:
{
  "id": "obj-<timestamp>",
  "description": "specific description of what to find or fix",
  "type": "<one of: edge-case|regression|performance|flaky-test|adversarial-review|missing-test|unsafe-change|benchmark-degradation>",
  "priority": <1-10>,
  "targetFile": "src/filename.ts",
  "createdAt": <unix timestamp ms>
}

Prefer scenario types with higher weights and those not recently attempted. Return only the JSON object.`;
}

export function buildProposalPrompt(
  objective: { description: string; type: ScenarioType; targetFile?: string },
  fileContents: Record<string, string>
): string {
  const filesSection = Object.entries(fileContents)
    .map(([path, content]) => `=== ${path} ===\n${content}`)
    .join('\n\n');

  return `You are a code engineer generating a minimal code change or test to achieve an objective.

Objective: ${objective.description}
Type: ${objective.type}
Target: ${objective.targetFile ?? 'any relevant file'}

Current code:
${filesSection}

Generate a MINIMAL, targeted change. For test objectives, add a test. For bug fixes, fix the bug. For edge cases, add handling.

Return ONLY valid JSON:
{
  "description": "what this change does",
  "changes": [
    {
      "path": "relative/path/to/file.ts",
      "content": "FULL file content after change"
    }
  ],
  "rationale": "why this change achieves the objective"
}

Rules:
- changes[].content must be the COMPLETE file, not a diff
- Make the smallest change that achieves the objective
- Do not introduce new dependencies
- Return only the JSON object`;
}

export function buildCritiquePrompt(
  proposal: { description: string; rationale: string; changes: Array<{ path: string; content: string }> }
): string {
  const changesSummary = proposal.changes.map((c) => ({
    path: c.path,
    lines: c.content.split('\n').length,
    preview: c.content.split('\n').slice(0, 10).join('\n'),
  }));

  return `You are a critical code reviewer. Review this proposed change for correctness and safety.

Proposal: ${proposal.description}
Rationale: ${proposal.rationale}

Changes:
${JSON.stringify(changesSummary, null, 2)}

Check for:
1. Logic errors or incorrect fixes
2. Regressions (does it break existing behavior?)
3. Unsafe patterns (eval, arbitrary exec, path traversal, etc.)
4. Incomplete implementation
5. Style inconsistencies

Return ONLY valid JSON:
{
  "approved": true/false,
  "warnings": ["list of warnings"],
  "risks": ["list of risks"],
  "suggestions": ["improvement suggestions"]
}

Approve if the change is correct and safe, even if not perfect. Reject only for serious issues.`;
}
