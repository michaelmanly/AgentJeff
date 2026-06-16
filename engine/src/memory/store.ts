import fs from 'fs/promises';
import path from 'path';
import { AttemptRecord, StrategyRecord, ScenarioRecord } from '../types.js';

const MEMORY_DIR = path.join(process.cwd(), 'memory');

async function ensureMemoryDir() {
  await fs.mkdir(MEMORY_DIR, { recursive: true });
}

async function readJsonFile<T>(filename: string, defaultValue: T): Promise<T> {
  await ensureMemoryDir();
  try {
    const content = await fs.readFile(path.join(MEMORY_DIR, filename), 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return defaultValue;
  }
}

async function writeJsonFile(filename: string, data: unknown): Promise<void> {
  await ensureMemoryDir();
  await fs.writeFile(path.join(MEMORY_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
}

export async function appendAttempt(record: AttemptRecord): Promise<void> {
  await ensureMemoryDir();
  const line = JSON.stringify(record) + '\n';
  await fs.appendFile(path.join(MEMORY_DIR, 'attempts.jsonl'), line, 'utf-8');
}

export async function readAttempts(limit = 100): Promise<AttemptRecord[]> {
  await ensureMemoryDir();
  try {
    const content = await fs.readFile(path.join(MEMORY_DIR, 'attempts.jsonl'), 'utf-8');
    const lines = content.split('\n').filter(Boolean);
    return lines.slice(-limit).map((l) => JSON.parse(l) as AttemptRecord);
  } catch {
    return [];
  }
}

export async function loadStrategies(): Promise<StrategyRecord[]> {
  return readJsonFile<StrategyRecord[]>('strategies.json', []);
}

export async function saveStrategies(strategies: StrategyRecord[]): Promise<void> {
  return writeJsonFile('strategies.json', strategies);
}

export async function loadScenarios(): Promise<ScenarioRecord[]> {
  return readJsonFile<ScenarioRecord[]>('scenarios.json', []);
}

export async function saveScenarios(scenarios: ScenarioRecord[]): Promise<void> {
  return writeJsonFile('scenarios.json', scenarios);
}

export async function loadScores(): Promise<number[]> {
  return readJsonFile<number[]>('scores.json', []);
}

export async function appendScore(score: number): Promise<void> {
  const scores = await loadScores();
  scores.push(score);
  await writeJsonFile('scores.json', scores.slice(-200)); // keep last 200
}
