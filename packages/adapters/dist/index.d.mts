import { InferenceAdapter, InferenceRequest, InferenceResponse, WorkspaceAdapter } from '@agentjeff/core';

interface BadgrAdapterOptions {
    apiKey?: string;
    model?: string;
    baseURL?: string;
}
declare class BadgrAdapter implements InferenceAdapter {
    private client;
    private model;
    constructor(opts?: BadgrAdapterOptions);
    complete(req: InferenceRequest): Promise<InferenceResponse>;
}

interface WorkspaceAdapterOptions {
    root: string;
    allowExec?: boolean;
}
declare class LocalWorkspaceAdapter implements WorkspaceAdapter {
    private root;
    private allowExec;
    constructor(opts: WorkspaceAdapterOptions);
    private resolve;
    listFiles(dir: string): Promise<string[]>;
    readFile(p: string): Promise<string>;
    writeFile(p: string, content: string): Promise<void>;
    exec(command: string): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }>;
}

export { BadgrAdapter, type BadgrAdapterOptions, LocalWorkspaceAdapter, type WorkspaceAdapterOptions };
