import { http, HttpResponse } from 'msw';
import { promises as fs } from 'node:fs';

export interface RecordedResponse {
  method: string;
  url: string;
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface RpcRecorderOptions {
  fixturePath: string;
}

export function createRpcRecorder(options: RpcRecorderOptions) {
  const records: RecordedResponse[] = [];
  const originalFetch = globalThis.fetch;

  return {
    async record<T>(fn: () => Promise<T>): Promise<T> {
      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const res = await originalFetch(input, init);
        const clone = res.clone();
        const url = String(input);
        const method = (init?.method ?? 'GET').toUpperCase();
        let body: unknown;
        try { body = await clone.json(); } catch { body = await clone.text(); }
        records.push({ method, url, status: res.status, body });
        return res;
      };
      try {
        return await fn();
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
    async save(): Promise<void> {
      await fs.mkdir(options.fixturePath.split('/').slice(0, -1).join('/') || '.', { recursive: true });
      await fs.writeFile(options.fixturePath, JSON.stringify(records, null, 2));
    },
    records,
  };
}

export async function createRpcReplay(options: RpcRecorderOptions) {
  const raw = await fs.readFile(options.fixturePath, 'utf8');
  const records = JSON.parse(raw) as RecordedResponse[];
  return {
    records,
    handlers() {
      return records.map((r) => {
        const method = r.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
        const fn = (http as any)[method];
        if (!fn) return http.get(r.url, () => HttpResponse.json(r.body, { status: r.status }));
        return fn(r.url, () => HttpResponse.json(r.body as any, { status: r.status }));
      });
    },
  };
}
