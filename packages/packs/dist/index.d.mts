import * as _newatom_sdk from '@newatom/sdk';
import { z } from 'zod';
import { LocalWorkspaceAdapter } from '@newatom/adapters';

declare function buildWorkspaceAssistant(workspaceRoot: string): _newatom_sdk.AgentDef<z.ZodObject<{
    task: z.ZodString;
    path: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path: string;
    task: string;
}, {
    task: string;
    path?: string | undefined;
}>, z.ZodObject<{
    summary: z.ZodString;
}, "strip", z.ZodTypeAny, {
    summary: string;
}, {
    summary: string;
}>>;

declare function buildWorkspaceTools(adapter: LocalWorkspaceAdapter): {
    listFiles: _newatom_sdk.ToolDef<z.ZodObject<{
        dir: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        dir: string;
    }, {
        dir?: string | undefined;
    }>, z.ZodArray<z.ZodString, "many">>;
    readFile: _newatom_sdk.ToolDef<z.ZodObject<{
        path: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        path: string;
    }, {
        path: string;
    }>, z.ZodString>;
    writeFile: _newatom_sdk.ToolDef<z.ZodObject<{
        path: z.ZodString;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        path: string;
        content: string;
    }, {
        path: string;
        content: string;
    }>, z.ZodObject<{
        ok: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        ok: boolean;
    }, {
        ok: boolean;
    }>>;
};

declare const extractionAgent: _newatom_sdk.AgentDef<z.ZodObject<{
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    text: string;
}, {
    text: string;
}>, z.ZodObject<{
    category: z.ZodString;
    priority: z.ZodEnum<["low", "medium", "high"]>;
    fields: z.ZodRecord<z.ZodString, z.ZodString>;
    summary: z.ZodString;
}, "strip", z.ZodTypeAny, {
    summary: string;
    category: string;
    priority: "low" | "medium" | "high";
    fields: Record<string, string>;
}, {
    summary: string;
    category: string;
    priority: "low" | "medium" | "high";
    fields: Record<string, string>;
}>>;

export { buildWorkspaceAssistant, buildWorkspaceTools, extractionAgent };
