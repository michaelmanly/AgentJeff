import { z } from 'zod';
import { defineAgent, defineTool } from '@agentjeff/sdk';

// Replace this stub with a real search API (Serper, Tavily, Brave, Bing, etc.)
const searchTool = defineTool({
  name: 'search',
  description: 'Search for information on a topic and return relevant results',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string(),
        snippet: z.string(),
      })
    ),
  }),
  async execute({ query }) {
    // TODO: replace with a real HTTP call, e.g.:
    // const resp = await fetch(
    //   `https://api.search.example.com?q=${encodeURIComponent(query)}&key=${process.env.SEARCH_API_KEY}`
    // );
    // const data = await resp.json();
    // return { results: data.items.map(...) };

    return {
      results: [
        {
          title: `Overview: ${query}`,
          snippet: `Key findings about "${query}". This topic spans multiple domains.`,
        },
        {
          title: `${query} — technical details`,
          snippet: `From a technical standpoint, "${query}" involves several components working together.`,
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
    detail: z.string().describe('Detailed explanation'),
    confidence: z.enum(['low', 'medium', 'high']),
  }),
  outputSchema: z.object({ recorded: z.boolean() }),
  async execute(_input) {
    return { recorded: true };
  },
});

export const researchAgent = defineAgent({
  name: 'researcher',
  instructions: `You are a thorough research assistant.
1. Search for the topic at least twice with different queries
2. Record 2-4 key findings using record_finding
3. Write a clear, concise summary that synthesizes all findings

Always note confidence levels. Be honest about uncertainty.`,
  inputSchema: z.object({
    topic: z.string().describe('The topic to research'),
  }),
  outputSchema: z.object({
    summary: z.string(),
    findingCount: z.number(),
  }),
  tools: [searchTool, recordFindingTool],
  runtimeOptions: { maxSteps: 15 },
});
