import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '../../utils/logger.js';

const execAsync = promisify(exec);
const logger = createLogger('DockerAdapter');

export class DockerAdapter {
  async isAvailable(): Promise<boolean> {
    try {
      await execAsync('docker info');
      return true;
    } catch {
      return false;
    }
  }

  async runContainer(opts: {
    image: string;
    command: string;
    volumes?: string[];
    env?: Record<string, string>;
    timeout?: number;
  }): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const { image, command, volumes = [], env = {}, timeout = 30000 } = opts;
    
    const volArgs = volumes.map(v => `-v ${v}`).join(' ');
    const envArgs = Object.entries(env).map(([k, v]) => `-e ${k}=${v}`).join(' ');
    const cmd = `docker run --rm ${volArgs} ${envArgs} ${image} ${command}`;
    
    try {
      const { stdout, stderr } = await execAsync(cmd, { timeout });
      return { stdout, stderr, exitCode: 0 };
    } catch (err: unknown) {
      const error = err as { stdout?: string; stderr?: string; code?: number };
      return {
        stdout: error.stdout ?? '',
        stderr: error.stderr ?? '',
        exitCode: error.code ?? 1,
      };
    }
  }
}
