import { createHmac, timingSafeEqual } from 'node:crypto';

export interface Sep10TokenClaims {
  iss: string;
  sub: string;
  iat: number;
  exp: number;
  aud?: string;
  client_domain?: string;
}

export interface VerifySep10TokenInput {
  token: string;
  secret: string; // HMAC secret used by backend-issued JWTs; for asymmetric keys use a JWT library.
  audience?: string;
  now?: number;
}

function base64UrlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64').toString('utf8');
}

export function verifySep10Token(input: VerifySep10TokenInput): Sep10TokenClaims {
  const [headerB64, payloadB64, sigB64] = input.token.split('.');
  if (!headerB64 || !payloadB64 || !sigB64) throw new Error('Invalid JWT format');
  const header = JSON.parse(base64UrlDecode(headerB64)) as { alg?: string };
  if (header.alg !== 'HS256') throw new Error('Unsupported JWT alg; expected HS256');
  const data = `${headerB64}.${payloadB64}`;
  const expected = createHmac('sha256', input.secret).update(data).digest();
  const actual = Buffer.from(sigB64.replace(/-/g, '+').replace(/_/g, '/') + (sigB64.length % 4 ? '='.repeat(4 - (sigB64.length % 4)) : ''), 'base64');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new Error('Invalid JWT signature');
  const claims = JSON.parse(base64UrlDecode(payloadB64)) as Sep10TokenClaims;
  const now = input.now ?? Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== 'number' || now >= claims.exp) throw new Error('JWT expired');
  if (input.audience && claims.aud !== input.audience) throw new Error('Invalid JWT audience');
  if (!claims.sub) throw new Error('Missing sub claim');
  return claims;
}
