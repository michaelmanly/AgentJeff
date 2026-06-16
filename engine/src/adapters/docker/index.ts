import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export class DockerAdapter {
  async listContainers(): Promise<string[]> {
    try {
      const { stdout } = await execFileAsync('docker', ['ps', '--format', '{{.Names}}'], { timeout: 5000 });
      return stdout.split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await execFileAsync('docker', ['info'], { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
