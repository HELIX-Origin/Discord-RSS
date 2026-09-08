import type { IncomingMessage, ServerResponse } from 'node:http';

export interface HandlerContext {
  params: Record<string, string>;
  query: URLSearchParams;
}

export type Handler<T> = (req: IncomingMessage, res: ServerResponse, ctx: HandlerContext, deps: T) => Promise<unknown> | unknown;

interface Route<T> {
  method: string;
  segments: Array<string | { param: string }>;
  handler: Handler<T>;
}

export class Router<T> {
  private readonly routes: Route<T>[] = [];

  add(method: string, path: string, handler: Handler<T>): void {
    const segments = path
      .split('/')
      .filter(Boolean)
      .map((seg) => (seg.startsWith(':') ? { param: seg.slice(1) } : seg));
    this.routes.push({ method, segments, handler });
  }

  find(method: string, pathname: string): { handler: Handler<T>; params: Record<string, string> } | null {
    const segments = pathname.split('/').filter(Boolean);
    for (const route of this.routes) {
      if (route.method !== method) continue;
      if (route.segments.length !== segments.length) continue;
      const params: Record<string, string> = {};
      let match = true;
      for (let i = 0; i < route.segments.length; i += 1) {
        const r = route.segments[i];
        if (typeof r === 'string') {
          if (r !== segments[i]) {
            match = false;
            break;
          }
        } else {
          params[r.param] = segments[i];
        }
      }
      if (match) return { handler: route.handler, params };
    }
    return null;
  }
}