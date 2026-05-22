import { z } from 'zod';

type EventType = 'run.started' | 'run.completed' | 'run.failed' | 'run.interrupted' | 'checkpoint.created' | 'tool.called' | 'tool.succeeded' | 'tool.failed' | 'state.updated';
interface AgentEvent {
    id: string;
    type: EventType;
    runId: string;
    timestamp: number;
    payload: Record<string, unknown>;
}

interface ToolDef<TInput extends z.ZodTypeAny = z.ZodTypeAny, TOutput extends z.ZodTypeAny = z.ZodTypeAny> {
    name: string;
    description: string;
    inputSchema: TInput;
    outputSchema: TOutput;
    permissions?: string[];
    execute(input: z.infer<TInput>, ctx: ToolContext): Promise<z.infer<TOutput>>;
}
interface ToolContext {
    runId: string;
    agentName: string;
    emit: (event: AgentEvent) => void;
}

interface RetryPolicy {
    maxAttempts: number;
    backoffMs: number;
}
interface TimeoutPolicy {
    stepTimeoutMs: number;
    totalTimeoutMs: number;
}
interface ExecutionPolicy {
    retry?: RetryPolicy;
    timeout?: TimeoutPolicy;
    maxSteps?: number;
}

interface AgentDef<TInput extends z.ZodTypeAny = z.ZodTypeAny, TOutput extends z.ZodTypeAny = z.ZodTypeAny> {
    name: string;
    instructions: string;
    inputSchema: TInput;
    outputSchema: TOutput;
    tools: ToolDef[];
    runtimeOptions?: {
        maxSteps?: number;
        timeoutMs?: number;
        retryPolicy?: RetryPolicy;
    };
}

interface AgentState {
    currentStep: string;
    intermediateValues: Record<string, unknown>;
    toolOutputs: Record<string, unknown>;
    errors: Array<{
        step: string;
        message: string;
    }>;
    checkpointData: Record<string, unknown>;
}
declare function initialState(): AgentState;

type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'interrupted';
interface Run {
    id: string;
    agentName: string;
    input: unknown;
    state: AgentState;
    status: RunStatus;
    startedAt: number;
    completedAt?: number;
    result?: unknown;
    error?: string;
    events: AgentEvent[];
}

interface InferenceRequest {
    messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
    }>;
    tools?: Array<{
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    }>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}
interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
}
interface InferenceResponse {
    content: string | null;
    toolCalls: ToolCall[];
    usage?: {
        promptTokens: number;
        completionTokens: number;
    };
}
interface InferenceAdapter {
    complete(request: InferenceRequest): Promise<InferenceResponse>;
}
interface WorkspaceAdapter {
    listFiles(dir: string): Promise<string[]>;
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    exec?(command: string): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }>;
}

interface Pack {
    name: string;
    version: string;
    description: string;
    agents: AgentDef[];
    tools: ToolDef[];
}
declare function definePack(pack: Pack): Pack;

declare const newId: () => `${string}-${string}-${string}-${string}-${string}`;

export { type AgentDef, type AgentEvent, type AgentState, type EventType, type ExecutionPolicy, type InferenceAdapter, type InferenceRequest, type InferenceResponse, type Pack, type RetryPolicy, type Run, type RunStatus, type TimeoutPolicy, type ToolCall, type ToolContext, type ToolDef, type WorkspaceAdapter, definePack, initialState, newId };
