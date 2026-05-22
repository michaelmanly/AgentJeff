import { z } from 'zod';
import { defineTool } from '@newatom/sdk';
import { LocalWorkspaceAdapter } from '@newatom/adapters';

export function buildWorkspaceTools(adapter: LocalWorkspaceAdapter) {
  const listFiles = defineTool({
    name: 'list_files',
    description: 'List files in a directory',
    inputSchema: z.object({ dir: z.string().default('.') }),
    outputSchema: z.array(z.string()),
    async execute({ dir }) { return adapter.listFiles(dir); },
  });

  const readFile = defineTool({
    name: 'read_file',
    description: 'Read file contents',
    inputSchema: z.object({ path: z.string() }),
    outputSchema: z.string(),
    async execute({ path }) { return adapter.readFile(path); },
  });

  const writeFile = defineTool({
    name: 'write_file',
    description: 'Write content to a file',
    inputSchema: z.object({ path: z.string(), content: z.string() }),
    outputSchema: z.object({ ok: z.boolean() }),
    async execute({ path, content }) {
      await adapter.writeFile(path, content);
      return { ok: true };
    },
  });

  return { listFiles, readFile, writeFile };
}
