import * as _agentjeff_sdk from '@agentjeff/sdk';
import { z } from 'zod';

declare function buildWorkspaceAgent(workspaceRoot: string): _agentjeff_sdk.AgentDef<z.ZodObject<{
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

declare const extractionAgent: _agentjeff_sdk.AgentDef<z.ZodObject<{
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

export { buildWorkspaceAgent, extractionAgent };
