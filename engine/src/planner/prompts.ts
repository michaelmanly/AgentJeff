import type { RepoObservation, AttemptRecord, StrategyRecord } from '../types.js';

export function buildPlannerPrompt(
  observation: RepoObservation,
  recentAttempts: AttemptRecord[],
  strategy: StrategyRecord | null,
): string {
  const recentScores = recentAttempts.slice(-5).map(a => a.score).join(', ');
  const recentTypes = recentAttempts.slice(-5).map(a => a.scenarioType).join(', ');
  
  const filesSummary = Object.entries(observation.fileContents)
    .slice(0, 5)
    .map(([path, content]) => `File: ${path}\n${content.slice(0, 500)}`)
    .join('\n---\n');

  return `You are an autonomous engineering engine planner. Your job is to choose the next objective.

## Repository State
Files: ${observation.files.join(', ')}
Git Status: ${observation.gitStatus}

## Source Code (sample)
${filesSummary}

## Recent Performance
Recent scores: ${recentScores || 'none yet'}
Recent scenario types: ${recentTypes || 'none yet'}
Current strategy: ${strategy?.name ?? 'balanced'}

## Instructions
Choose the single most valuable next objective from these types:
- edge-case: Find and handle edge cases in existing code
- regression: Prevent regressions in functionality  
- performance: Improve performance characteristics
- flaky-test: Fix or identify flaky tests
- adversarial-review: Review code for security/correctness issues
- missing-test: Add missing test coverage
- unsafe-change: Identify unsafe code patterns
- benchmark-degradation: Track and prevent benchmark degradation

Respond with ONLY a JSON object:
{
  "type": "<scenario-type>",
  "description": "<specific description of what to do>",
  "priority": <1-10>,
  "rationale": "<why this is most valuable now>"
}`;
}
