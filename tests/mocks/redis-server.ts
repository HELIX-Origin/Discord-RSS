import { createServer, type Socket } from 'node:net';

export interface MockRedisServer {
  url: string;
  close: () => Promise<void>;
  /** Inspect internal state for assertions. */
  snapshot: () => {
    sets: ReadonlyMap<string, Set<string>>;
    strings: ReadonlyMap<string, { value: string; expiresAt: number | null }>;
  };
}

export function startMockRedisServer(): Promise<MockRedisServer> {
  return new Promise((resolve, reject) => {
    const sets = new Map<string, Set<string>>();
    const strings = new Map<string, { value: string; expiresAt: number | null }>();

    function isExpired(entry: { expiresAt: number | null }): boolean {
      return entry.expiresAt !== null && Date.now() > entry.expiresAt;
    }

    function removeExpiredStrings(): void {
      for (const [key, entry] of strings) {
        if (isExpired(entry)) strings.delete(key);
      }
    }

    const server = createServer((socket: Socket) => {
      let buffer = '';

      socket.on('data', (data) => {
        buffer += data.toString('utf8');
        while (true) {
          const result = parseCommand(buffer);
          if (!result) break;
          buffer = result.remaining;
          handleCommand(result.command, socket);
        }
      });

      function handleCommand(args: string[], sock: Socket): void {
        const cmd = args[0]?.toUpperCase();

        switch (cmd) {
          case 'PING': {
            sock.write('+PONG\r\n');
            return;
          }
          case 'SISMEMBER': {
            const key = args[1];
            const member = args[2];
            if (key === undefined || member === undefined) {
              sock.write('-ERR wrong number of arguments\r\n');
              return;
            }
            const set = sets.get(key);
            const present = set?.has(member) ?? false;
            sock.write(`:${present ? 1 : 0}\r\n`);
            return;
          }
          case 'SADD': {
            const key = args[1];
            const members = args.slice(2);
            if (key === undefined || members.length === 0) {
              sock.write('-ERR wrong number of arguments\r\n');
              return;
            }
            let set = sets.get(key);
            if (!set) {
              set = new Set<string>();
              sets.set(key, set);
            }
            let added = 0;
            for (const member of members) {
              if (!set.has(member)) {
                set.add(member);
                added++;
              }
            }
            sock.write(`:${added}\r\n`);
            return;
          }
          case 'SET': {
            // SET key value [NX] [EX seconds]
            const key = args[1];
            const value = args[2];
            if (key === undefined || value === undefined) {
              sock.write('-ERR wrong number of arguments\r\n');
              return;
            }
            const nx = args.slice(3).some((a) => a.toUpperCase() === 'NX');
            const exIndex = args.slice(3).findIndex((a) => a.toUpperCase() === 'EX');
            const exSeconds = exIndex >= 0 ? Number(args[3 + exIndex + 1]) : null;

            removeExpiredStrings();
            if (nx && strings.has(key)) {
              sock.write('$-1\r\n');
              return;
            }
            const expiresAt = exSeconds !== null && Number.isFinite(exSeconds) ? Date.now() + exSeconds * 1000 : null;
            strings.set(key, { value, expiresAt });
            sock.write('+OK\r\n');
            return;
          }
          case 'DEL': {
            const keys = args.slice(1);
            let removed = 0;
            for (const key of keys) {
              if (strings.delete(key)) removed++;
              if (sets.delete(key)) removed++;
            }
            sock.write(`:${removed}\r\n`);
            return;
          }
          case 'QUIT': {
            sock.write('+OK\r\n', () => sock.end());
            return;
          }
          default: {
            // Return OK for incidental handshake commands (CLIENT SETINFO, etc.)
            sock.write('+OK\r\n');
          }
        }
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({
        url: `redis://127.0.0.1:${port}`,
        close: () => new Promise<void>((res) => server.close(() => res())),
        snapshot: () => ({ sets, strings }),
      });
    });

    server.on('error', reject);
  });
}

function parseCommand(buffer: string): { command: string[]; remaining: string } | null {
  if (buffer.length === 0) return null;
  if (buffer[0] !== '*') return null;

  const firstCRLF = buffer.indexOf('\r\n');
  if (firstCRLF === -1) return null;

  const count = Number(buffer.slice(1, firstCRLF));
  if (!Number.isInteger(count) || count < 0) return null;

  let offset = firstCRLF + 2;
  const command: string[] = [];

  for (let i = 0; i < count; i++) {
    if (buffer[offset] !== '$') return null;
    const lenEnd = buffer.indexOf('\r\n', offset);
    if (lenEnd === -1) return null;
    const length = Number(buffer.slice(offset + 1, lenEnd));
    if (!Number.isInteger(length) || length < 0) return null;
    offset = lenEnd + 2;
    if (buffer.length < offset + length + 2) return null;
    command.push(buffer.slice(offset, offset + length));
    offset += length + 2;
  }

  return { command, remaining: buffer.slice(offset) };
}
