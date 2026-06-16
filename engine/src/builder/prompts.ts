import type { Objective, RepoObservation } from '../types.js';

export function buildBuilderPrompt(objective: Objective, observation: RepoObservation): string {
  const filesSummary = Object.entries(observation.fileContents)
    .map(([path, content]) => `### ${path}\n\`\`\`typescript\n${content}\n\`\`\``)
    .join('\n\n');

  return `You are an autonomous code engineer. Generate a specific, minimal code change.

## Objective
Type: ${objective.type}
Description: ${objective.description}
Priority: ${objective.priority}

## Current Code
${filesSummary}

## Instructions
Generate a focused code change that addresses the objective. The change should be:
- Minimal and targeted
- Correct TypeScript
- Not break existing functionality
- Add value (fix bugs, improve coverage, improve safety)

Respond with ONLY a JSON object:
{
  "description": "<what this change does>",
  "rationale": "<why this approach>",
  "changes": [
    {
      "path": "<relative path from repo root, e.g. src/calculator.ts>",
      "content": "<complete new file content>"
    }
  ]
}`;
}
