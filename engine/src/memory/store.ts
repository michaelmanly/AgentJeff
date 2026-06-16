import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { AttemptRecord, StrategyRecord, ScenarioRecord } from '../types.js';

function ensureDir(filePath: string) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function ensureFile(filePath: string, defaultContent: string = '') {
  ensureDir(filePath);
  if (!existsSync(filePath)) {
    writeFileSync(filePath, defaultContent, 'utf-8');
  }
}

export class MemoryStore {
  constructor(
    private attemptsFile: string,
    private strategiesFile: string,
    private scenariosFile: string,
    private scoresFile: string,
  ) {
    ensureFile(attemptsFile, '');
    ensureFile(strategiesFile, '[]');
    ensureFile(scenariosFile, '[]');
    ensureFile(scoresFile, '[]');
  }

  async appendAttempt(record: AttemptRecord): Promise<void> {
    ensureFile(this.attemptsFile, '');
    appendFileSync(this.attemptsFile, JSON.stringify(record) + '\n', 'utf-8');
  }

  async readAttempts(limit?: number): Promise<AttemptRecord[]> {
    if (!existsSync(this.attemptsFile)) return [];
    const content = readFileSync(this.attemptsFile, 'utf-8');
    const lines = content.split('\n').filter(Boolean);
    const records = lines.map(line => {
      try { return JSON.parse(line) as AttemptRecord; } catch { return null; }
    }).filter(Boolean) as AttemptRecord[];
    return limit ? records.slice(-limit) : records;
  }

  async loadStrategies(): Promise<StrategyRecord[]> {
    if (!existsSync(this.strategiesFile)) return [];
    try {
      return JSON.parse(readFileSync(this.strategiesFile, 'utf-8')) as StrategyRecord[];
    } catch { return []; }
  }

  async saveStrategies(strategies: StrategyRecord[]): Promise<void> {
    ensureFile(this.strategiesFile, '[]');
    writeFileSync(this.strategiesFile, JSON.stringify(strategies, null, 2), 'utf-8');
  }

  async loadScenarios(): Promise<ScenarioRecord[]> {
    if (!existsSync(this.scenariosFile)) return [];
    try {
      return JSON.parse(readFileSync(this.scenariosFile, 'utf-8')) as ScenarioRecord[];
    } catch { return []; }
  }

  async saveScenarios(scenarios: ScenarioRecord[]): Promise<void> {
    ensureFile(this.scenariosFile, '[]');
    writeFileSync(this.scenariosFile, JSON.stringify(scenarios, null, 2), 'utf-8');
  }

  async loadScores(): Promise<number[]> {
    if (!existsSync(this.scoresFile)) return [];
    try {
      return JSON.parse(readFileSync(this.scoresFile, 'utf-8')) as number[];
    } catch { return []; }
  }

  async appendScore(score: number): Promise<void> {
    const scores = await this.loadScores();
    scores.push(score);
    writeFileSync(this.scoresFile, JSON.stringify(scores), 'utf-8');
  }
}
