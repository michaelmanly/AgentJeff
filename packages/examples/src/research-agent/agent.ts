import { z } from 'zod';
import { defineAgent, defineTool } from '@agentjeff/sdk';

const searchTool = defineTool({
  name: 'search',
  description: 'Search for information on a topic and return relevant snippets',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string(),
        snippet: z.string(),
        source: z.string(),
      })
    ),
  }),
  async execute({ query }) {
    // Stub: in a real agent replace this with a live search API call
    return {
      results: [
        {
          title: `Overview: ${query}`,
          snippet: `Key findings about "${query}": this topic spans multiple domains and has seen recent developments in industry and research.`,
          source: 'stub-search',
        },
        {
          title: `Deep dive: ${query} — technical perspective`,
          snippet: `From a technical standpoint, "${query}" involves several components working together. Practitioners typically start with fundamentals before moving to advanced applications.`,
          source: 'stub-search',
        },
      ],
    };
  },
});

const recordFindingTool = defineTool({
  name: 'record_finding',
  description: 'Record a key finding to include in the final report',
  inputSchema: z.object({
    heading: z.string().describe('Short heading for this finding'),
    detail: z.string().describe('Detailed explanation of the finding'),
    confidence: z.enum(['low', 'medium', 'high']).describe('Confidence in this finding'),
  }),
  outputSchema: z.object({ recorded: z.boolean() }),
  async execute(_input) {
    return { recorded: true };
  },
});

export const researchAgent = defineAgent({
  name: 'researcher',
  instructions: `You are a research assistant. Given a topic, you:
1. Search for relevant information using the search tool
2. Identify key findings and record each one with record_finding
3. Synthesize your findings into a concise report

Always search at least twice with different queries before drawing conclusions.
Record 2-4 key findings. Then write a final summary that integrates everything.`,
  inputSchema: z.object({
    topic: z.string().describe('The topic to research'),
    depth: z.enum(['brief', 'thorough']).default('brief'),
  }),
  outputSchema: z.object({
    summary: z.string(),
    findingCount: z.number(),
  }),
  tools: [searchTool, recordFindingTool],
  runtimeOptions: { maxSteps: 12 },
});
