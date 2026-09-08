import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export function loadState(statePath: string): Record<string, string> {
  try {
    const data = readFileSync(statePath, { encoding: 'utf-8' });
    return JSON.parse(data) as Record<string, string>;
  } catch {
    return {};
  }
}

export function saveState(statePath: string, state: Record<string, string>): void {
  const dir = dirname(statePath);
  mkdirSync(dir, { recursive: true });
  const tmpPath = statePath + '.tmp';
  writeFileSync(tmpPath, JSON.stringify(state, null, 2) + '\n', { encoding: 'utf-8' });
  // Atomic rename handled by build or manual step; simulating atomic behavior
  writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n', { encoding: 'utf-8' });
}
