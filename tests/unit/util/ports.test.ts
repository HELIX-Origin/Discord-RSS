import { describe, expect, it } from 'vitest';
import { clearPorts } from '../../../src/util/ports.js';
import { createLogger } from '../../../src/util/logger.js';

describe('clearPorts', () => {
  it('handles empty and invalid port numbers gracefully', () => {
    const logger = createLogger('test', 'error');
    expect(() => clearPorts([], logger)).not.toThrow();
    expect(() => clearPorts([0, -1], logger)).not.toThrow();
  });

  it('handles arbitrary port list without error', () => {
    // Tests that clearing an inactive port completes cleanly
    expect(() => clearPorts([59998, 59999])).not.toThrow();
  });
});
