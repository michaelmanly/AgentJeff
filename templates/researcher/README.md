# researcher

Multi-step research agent that searches, records findings, and writes a report.

## Get started

```bash
cp .env.example .env    # add BADGR_API_KEY
npm install
npm start "your topic here"
```

## What it does

1. Searches the topic (stub — replace with Serper, Tavily, Bing, etc.)
2. Records key findings with confidence levels
3. Synthesizes a structured report

## Wire up a real search API

In `src/agent.ts`, replace the stub `execute` function in `searchTool` with a real HTTP call:

```typescript
async execute({ query }) {
  const resp = await fetch(
    `https://api.serper.dev/search`,
    {
      method: 'POST',
      headers: { 'X-API-KEY': process.env.SERPER_API_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query }),
    }
  );
  const data = await resp.json();
  return {
    results: data.organic.map((r: any) => ({ title: r.title, snippet: r.snippet })),
  };
}
```

## Run with a topic argument

```bash
npm start "large language models"
npm start "Rust ownership model"
```
