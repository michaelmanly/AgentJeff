import type { Proposal, RepoObservation } from '../types.js';

export function buildCriticPrompt(proposal: Proposal, observation: RepoObservation): string {
  const changesSummary = proposal.changes.map(c => 
    `### ${c.path}\n\`\`\`typescript\n${c.content.slice(0, 1000)}\n\`\`\``
  ).join('\n\n');

  const originalSummary = proposal.changes.map(c =>
    c.previousContent
      ? `### ${c.path} (original)\n\`\`\`typescript\n${c.previousContent.slice(0, 800)}\n\`\`\``
      : `### ${c.path}: (new file)`
  ).join('\n\n');

  return `You are a critical code reviewer. Evaluate this proposed change.

## Proposal
Description: ${proposal.description}
Rationale: ${proposal.rationale}

## Original Code
${originalSummary}

## Proposed Changes
${changesSummary}

## Review Checklist
Look for:
1. Logic errors or incorrect implementations
2. Missing edge case handling
3. Breaking changes to existing functionality
4. Unsafe patterns (unchecked inputs, division by zero, null dereference)
5. TypeScript type errors
6. Tests that test nothing or test the wrong thing

Respond with ONLY a JSON object:
{
  "approved": <true|false>,
  "warnings": ["<warning 1>", ...],
  "risks": ["<risk 1>", ...],
  "suggestions": ["<suggestion 1>", ...]
}`;
}
