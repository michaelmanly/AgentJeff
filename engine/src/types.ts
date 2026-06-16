export type EngineStatus = 'idle' | 'running' | 'paused' | 'stopped';

export type ScenarioType =
  | 'edge-case'
  | 'regression'
  | 'performance'
  | 'flaky-test'
  | 'adversarial-review'
  | 'missing-test'
  | 'unsafe-change'
  | 'benchmark-degradation';

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface InferenceRequest {
  messages: Message[];
  tools?: Array<{ name: string; description: string; parameters: Record<string, unknown> }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface InferenceResponse {
  content: string | null;
  toolCalls: ToolCall[];
  usage?: { promptTokens: number; completionTokens: number };
}

export interface InferenceAdapter {
  complete(request: InferenceRequest): Promise<InferenceResponse>;
}

export interface Objective {
  id: string;
  description: string;
  type: ScenarioType;
  priority: number;
  targetFile?: string;
  createdAt: number;
}

export interface FileChange {
  path: string;
  content: string;
  previousContent?: string;
}

export interface Proposal {
  id: string;
  objectiveId: string;
  description: string;
  changes: FileChange[];
  rationale: string;
  createdAt: number;
}

export interface CritiqueResult {
  proposalId: string;
  approved: boolean;
  warnings: string[];
  risks: string[];
  suggestions: string[];
}

export interface CheckResult {
  name: string;
  passed: boolean;
  output: string;
  duration: number;
}

export interface VerificationResult {
  proposalId: string;
  passed: boolean;
  checks: CheckResult[];
  duration: number;
}

export interface AttemptMetrics {
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  lintErrors: number;
  buildSuccess: boolean;
  regressions: number;
}

export interface AttemptRecord {
  id: string;
  objectiveId: string;
  proposalId: string;
  scenarioType: ScenarioType;
  critique: CritiqueResult;
  verification: VerificationResult;
  score: number;
  metrics: AttemptMetrics;
  timestamp: number;
  strategy: string;
  workerIndex?: number;
}

export interface StrategyRecord {
  id: string;
  name: string;
  description: string;
  promptStyle: string;
  scenarioWeights: Record<ScenarioType, number>;
  avgScore: number;
  usageCount: number;
  winRate: number;
  lastUsed: number;
}

export interface ScenarioRecord {
  id: string;
  type: ScenarioType;
  description: string;
  generatedBy: string;
  model: string;
  novelty: number;
  issueDiscoveryRate: number;
  duplicateCount: number;
  createdAt: number;
}

export interface EngineMetrics {
  iterations: number;
  failures: number;
  avgCycleTimeMs: number;
  scoreTrend: number[];
  repeatedMistakes: number;
  builderChangesAttempted: number;
  builderChangesAccepted: number;
  builderChangesReverted: number;
  builderRegressionRate: number;
  criticCorrectWarnings: number;
  criticMisses: number;
  criticFalseAlarms: number;
  scenarioNovelty: number;
  scenarioIssueDiscoveryRate: number;
  scenarioDuplicateRate: number;
  verifierChecksRun: number;
  verifierFailureCatchRate: number;
  verifierNoisyFailures: number;
  improvementVariantsTested: number;
  improvementWinRate: number;
  improvementGainOverBaseline: number;
}

export interface RepoObservation {
  files: string[];
  gitStatus: string;
  recentCommits: string[];
  testResults?: TestRunResult;
}

export interface TestRunResult {
  passed: number;
  failed: number;
  total: number;
  duration: number;
  output: string;
}

export interface EngineState {
  status: EngineStatus;
  pid: number;
  iteration: number;
  startedAt: number;
  lastCycleAt: number;
  metrics: EngineMetrics;
}

export interface OllamaSettings {
  baseUrl: string;
  primaryModel: string;
  fastModel: string;
  temperature: number;
  maxTokens: number;
}

export interface EngineSettings {
  cycleDelayMs: number;
  maxConcurrentWorkers: number;
  improvementIntervalIterations: number;
  maxAttemptsToReview: number;
  sandboxRepoPath: string;
  primaryModel: string;
  fastModel: string;
  defaultStrategy: string;
}
