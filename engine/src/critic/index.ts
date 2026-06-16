import type { InferenceAdapter, Proposal, CritiqueResult, RepoObservation } from '../types.js';
import { buildCriticPrompt } from './prompts.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Critic');

export class Critic {
  constructor(private adapter: InferenceAdapter, private model: string) {}

  async critiqueProposal(
    proposal: Proposal,
    observation: RepoObservation,
  ): Promise<CritiqueResult> {
    if (proposal.changes.length === 0) {
      return {
        proposalId: proposal.id,
        approved: true,
        warnings: ['No changes proposed'],
        risks: [],
        suggestions: [],
      };
    }

    try {
      const prompt = buildCriticPrompt(proposal, observation);
      const response = await this.adapter.complete({
        messages: [{ role: 'user', content: prompt }],
        model: this.model,
        temperature: 0.2,
        maxTokens: 1024,
      });

      const content = response.content ?? '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn('Critic returned no JSON, approving by default');
        return {
          proposalId: proposal.id,
          approved: true,
          warnings: ['Critic parse failed'],
          risks: [],
          suggestions: [],
        };
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        approved?: boolean;
        warnings?: string[];
        risks?: string[];
        suggestions?: string[];
      };

      return {
        proposalId: proposal.id,
        approved: parsed.approved ?? true,
        warnings: parsed.warnings ?? [],
        risks: parsed.risks ?? [],
        suggestions: parsed.suggestions ?? [],
      };
    } catch (err) {
      logger.warn('Critic failed, approving by default', err);
      return {
        proposalId: proposal.id,
        approved: true,
        warnings: ['Critic error: ' + String(err)],
        risks: [],
        suggestions: [],
      };
    }
  }
}
