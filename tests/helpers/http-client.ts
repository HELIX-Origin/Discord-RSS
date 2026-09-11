export interface ApiResponse<T = unknown> {
  status: number;
  headers: Headers;
  body: T;
  raw: string;
}

export class TestClient {
  private jar = new Map<string, string>();

  constructor(private readonly baseUrl: string) {}

  get cookie(): string | undefined {
    return this.jar.get('session');
  }

  setCookie(value: string): void {
    const formatted = value.includes('=') ? value : `drss_session=${value}`;
    this.jar.set('session', formatted);
  }

  setSessionToken(token: string): void {
    this.jar.set('session', `drss_session=${token}`);
  }

  clearCookie(): void {
    this.jar.delete('session');
  }

  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    customHeaders?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {};
    const cookie = this.jar.get('session');
    if (cookie) headers.cookie = cookie;
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (customHeaders) Object.assign(headers, customHeaders);

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const main = setCookie.split(';')[0];
      if (main) this.jar.set('session', main);
    }

    const raw = await res.text();
    let parsed: unknown = raw;
    try {
      parsed = JSON.parse(raw);
    } catch {
      /* leave as raw text */
    }

    return { status: res.status, headers: res.headers, body: parsed as T, raw };
  }

  async get<T = unknown>(path: string, options?: { headers?: Record<string, string> }): Promise<ApiResponse<T>> {
    return this.request('GET', path, undefined, options?.headers);
  }

  async post<T = unknown>(
    path: string,
    body?: unknown,
    options?: { headers?: Record<string, string> },
  ): Promise<ApiResponse<T>> {
    return this.request('POST', path, body, options?.headers);
  }

  async patch<T = unknown>(
    path: string,
    body?: unknown,
    options?: { headers?: Record<string, string> },
  ): Promise<ApiResponse<T>> {
    return this.request('PATCH', path, body, options?.headers);
  }

  async delete<T = unknown>(path: string, options?: { headers?: Record<string, string> }): Promise<ApiResponse<T>> {
    return this.request('DELETE', path, undefined, options?.headers);
  }
}
