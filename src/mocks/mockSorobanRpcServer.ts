import http from 'node:http';

export type JsonRpcRequest = { jsonrpc?: string; id?: string | number; method: string; params?: unknown };
export type JsonRpcResponse = { jsonrpc: '2.0'; id: string | number | null; result?: unknown; error?: { code: number; message: string; data?: unknown } };

export interface MockSorobanRpcOptions {
  port?: number;
  handlers?: Record<string, (params: unknown, req: JsonRpcRequest) => unknown | Promise<unknown>>;
}

export function createMockSorobanRpcServer(options: MockSorobanRpcOptions = {}) {
  const handlers: Record<string, (params: unknown, req: JsonRpcRequest) => unknown | Promise<unknown>> = {
    getHealth: () => ({ status: 'healthy' }),
    getLatestLedger: () => ({ id: 'mock-ledger', protocolVersion: 21, sequence: 1 }),
    simulateTransaction: () => ({ minResourceFee: '100', events: [], results: [{ xdr: '' }] }),
    sendTransaction: () => ({ status: 'PENDING', hash: 'mock-tx-hash' }),
    getTransaction: () => ({ status: 'SUCCESS', ledger: 1 }),
    ...options.handlers,
  };

  const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST') {
      res.statusCode = 405; res.end('Method Not Allowed'); return;
    }
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body) as JsonRpcRequest | JsonRpcRequest[];
        const handle = async (r: JsonRpcRequest): Promise<JsonRpcResponse> => {
          const fn = handlers[r.method];
          if (!fn) return { jsonrpc: '2.0', id: r.id ?? null, error: { code: -32601, message: `Method not found: ${r.method}` } };
          try {
            const result = await fn(r.params, r);
            return { jsonrpc: '2.0', id: r.id ?? null, result };
          } catch (e) {
            return { jsonrpc: '2.0', id: r.id ?? null, error: { code: -32000, message: e instanceof Error ? e.message : String(e) } };
          }
        };
        const response = Array.isArray(payload) ? await Promise.all(payload.map(handle)) : await handle(payload);
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(response));
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }));
      }
    });
  });

  return {
    url: `http://127.0.0.1:${options.port ?? 0}`,
    async start() {
      await new Promise<void>((resolve) => server.listen(options.port ?? 0, '127.0.0.1', () => resolve()));
      const addr = server.address();
      if (addr && typeof addr === 'object') this.url = `http://127.0.0.1:${addr.port}`;
      return this;
    },
    async stop() { await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))); },
    setHandler(method: string, fn: (params: unknown, req: JsonRpcRequest) => unknown | Promise<unknown>) { handlers[method] = fn; },
  };
}
