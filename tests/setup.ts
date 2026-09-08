import { beforeAll, afterAll } from 'vitest';
import { startMsw, stopMsw } from './mocks/msw-server.js';

beforeAll(() => {
  startMsw();
});

afterAll(() => {
  stopMsw();
});
