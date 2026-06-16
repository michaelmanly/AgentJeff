import { InferenceAdapter, Proposal, CritiqueResult } from '../types.js';
import { buildCritiquePrompt } from '../planner/prompts.js';
import { logger } from '../utils/logger.js';

const FORBIDDEN_PATTERNS = [
  'rm -rf', 'eval(', 'exec(', 'DROP TABLE', 'DELETE FROM',
  'process.exit', '__proto__', 'prototype.constructor',
];

export class Critic {
  constructor(private adapter: InferenceAdapter) {}

  async critiqueProposal(proposal: Proposal): Promise<CritiqueResult> {
    // Always run static checks first
    const staticRisks = this.runStaticChecks(proposal);

    if (proposal.changes.length === 0) {
      return {
        proposalId: proposal.id,
        approved: false,
        warnings: ['No changes proposed'],
        risks: [],
        suggestions: ['Generate a concrete code change'],
      };
    }

    const prompt = buildCritiquePrompt(proposal);

    try {
      const response = await this.adapter.complete({
        messages: [
          { role: 'system', content: 'You are a critical code reviewer. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        maxTokens: 512,
      });

      const content = response.content ?? '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const risks = [...(parsed.risks ?? []), ...staticRisks];
        return {
          proposalId: proposal.id,
          approved: parsed.approved === true && staticRisks.length === 0,
          warnings: parsed.warnings ?? [],
          risks,
          suggestions: parsed.suggestions ?? [],
        };
      }
    } catch (err) {
      logger.warn('Critic LLM failed, using static-only review', err);
    }

    // Fallback: approve if no static risks
    return {
      proposalId: proposal.id,
      approved: staticRisks.length === 0,
      warnings: [],
      risks: staticRisks,
      suggestions: [],
    };
  }

  private runStaticChecks(proposal: Proposal): string[] {
    const risks: string[] = [];
    for (const change of proposal.changes) {
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (change.content.includes(pattern)) {
          risks.push(`Forbidden pattern found: "${pattern}" in ${change.path}`);
        }
      }
      if (change.content.split('\n').length > 300) {
        risks.push(`Change to ${change.path} is very large (${change.content.split('\n').length} lines) - possible unintended overwrite`);
      }
    }
    return risks;
  }
}
