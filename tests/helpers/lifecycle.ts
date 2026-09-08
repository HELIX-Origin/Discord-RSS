import type { CleanupFunc } from 'vitest';

export type CleanupTask = () => void | Promise<void>;

export function createCleanup(): { push: (task: CleanupTask) => void; run: () => Promise<void> } {
  const tasks: CleanupTask[] = [];
  return {
    push(task) {
      tasks.push(task);
    },
    async run() {
      for (let i = tasks.length - 1; i >= 0; i--) {
        try {
          await tasks[i]!();
        } catch {
          /* ignore cleanup errors */
        }
      }
    },
  };
}

export function autoCleanup(cleanup: CleanupFunc): { push: (task: CleanupTask) => void } {
  const tasks: CleanupTask[] = [];
  cleanup(async () => {
    for (let i = tasks.length - 1; i >= 0; i--) {
      try {
        await tasks[i]!();
      } catch {
        /* ignore cleanup errors */
      }
    }
  });
  return {
    push(task) {
      tasks.push(task);
    },
  };
}
