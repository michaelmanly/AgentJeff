# code-reviewer

An AI code reviewer that reads your workspace, records issues with severity + suggestions, and gives an overall recommendation.

## Get started

```bash
cp .env.example .env    # add BADGR_API_KEY
npm install
npm start ../my-project     # review a specific directory
npm start .                 # review current directory
```

## What it does

1. Lists files in the target directory
2. Reads source files (TypeScript/JavaScript)
3. Records issues with severity (`info` / `warning` / `error`) and suggestions
4. Returns a summary with a recommendation: `approve` / `approve_with_comments` / `request_changes`

## Customise

**Focus on a specific file:**

```typescript
// src/index.ts
input: { task: 'Review only the auth module', focusPath: 'src/auth' }
```

**Adjust the reviewer's priority:**

Edit the `instructions` in `src/agent.ts` to emphasize what matters for your project.

**Post results to GitHub:**

After `result.result` is available, call the GitHub API to post review comments.
