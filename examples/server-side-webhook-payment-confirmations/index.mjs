import crypto from 'node:crypto';

const horizonUrl = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
const account = process.env.WATCH_ACCOUNT;
const webhookUrl = process.env.WEBHOOK_URL;
const webhookSecret = process.env.WEBHOOK_SECRET || '';

if (!account || !webhookUrl) {
  console.error('WATCH_ACCOUNT and WEBHOOK_URL are required');
  process.exit(1);
}

const seen = new Set();
let cursor = 'now';
let backoffMs = 1000;

function sign(body) {
  if (!webhookSecret) return undefined;
  return crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');
}

async function postWebhook(payment) {
  const body = JSON.stringify({
    type: 'stellar.payment.confirmed',
    account,
    payment,
    observedAt: new Date().toISOString(),
  });
  const headers = { 'content-type': 'application/json' };
  const sig = sign(body);
  if (sig) headers['x-webhook-signature'] = `sha256=${sig}`;
  const res = await fetch(webhookUrl, { method: 'POST', headers, body });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Webhook failed: ${res.status} ${text}`);
  }
}

async function handlePayment(record) {
  const id = record.id || record.paging_token;
  if (!id || seen.has(id)) return;
  const isIncomingPayment =
    (record.type === 'payment' || record.type_i === 1 || record.type === 'create_account' || record.type_i === 0) &&
    (record.to === account || record.account === account || record.type === 'create_account');
  if (!isIncomingPayment) return;
  seen.add(id);
  await postWebhook(record);
  console.log('webhook sent', id);
}

async function stream() {
  const url = new URL(`/accounts/${account}/payments`, horizonUrl);
  url.searchParams.set('cursor', cursor);
  url.searchParams.set('order', 'asc');
  console.log('connecting', url.toString());

  const res = await fetch(url, { headers: { Accept: 'text/event-stream' } });
  if (!res.ok || !res.body) throw new Error(`Stream failed: ${res.status}`);
  backoffMs = 1000;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split('\n\n');
    buf = parts.pop() ?? '';
    for (const part of parts) {
      const dataLines = part.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim());
      if (dataLines.length === 0) continue;
      const data = dataLines.join('\n');
      if (!data || data === '"hello"' || data === 'hello') continue;
      try {
        const record = JSON.parse(data);
        if (record.paging_token) cursor = record.paging_token;
        await handlePayment(record);
      } catch (err) {
        console.error('parse/handle error', err);
      }
    }
  }
}

async function main() {
  while (true) {
    try {
      await stream();
      throw new Error('stream ended');
    } catch (err) {
      console.error('stream error', err);
      await new Promise((r) => setTimeout(r, backoffMs));
      backoffMs = Math.min(backoffMs * 2, 30000);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
