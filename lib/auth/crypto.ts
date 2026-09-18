/**
 * Auth crypto helpers — password hashing (scrypt) and stateless HMAC tokens.
 * Free-tier friendly: no external auth server, no session store required.
 */
import crypto from 'crypto';

function secret(): string {
 const value = process.env.AUTH_SECRET;
 if (!value || value.length < 32 || value === 'gokulam-dev-secret-change-me') throw new Error('AUTH_SECRET must contain at least 32 random characters');
 return value;
}

export function hashPassword(password: string, salt?: string): { salt: string; hash: string } {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, s, 64).toString('hex');
  return { salt: s, hash };
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const h = crypto.scryptSync(password, salt, 64).toString('hex');
  if (h.length !== hash.length) return false;
  return crypto.timingSafeEqual(new Uint8Array(Buffer.from(h)), new Uint8Array(Buffer.from(hash)));
}

export interface TokenPayload {
  sub: string;
  role: string;
  name: string;
  email: string;
  exp: number;
}

export function signToken(payload: Omit<TokenPayload, 'exp'>, ttlMs = 1000 * 60 * 60 * 12): string {
  const full: TokenPayload = { ...payload, exp: Date.now() + ttlMs };
  const body = Buffer.from(JSON.stringify(full)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token?: string | null): TokenPayload | null {
  if (!token || token.length > 4096 || token.split('.').length !== 2) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig || !/^[A-Za-z0-9_-]+$/.test(body) || !/^[A-Za-z0-9_-]{43}$/.test(sig)) return null;
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(new Uint8Array(Buffer.from(sig)), new Uint8Array(Buffer.from(expected)))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenPayload;
    if (!Number.isFinite(payload.exp) || payload.exp <= Date.now() || typeof payload.sub !== 'string' || !payload.sub ||
      !['ADMIN','COORDINATOR'].includes(payload.role) || typeof payload.name !== 'string' || typeof payload.email !== 'string') return null;
    return payload;
  } catch {
    return null;
  }
}

/** Opaque, non-guessable ticket token. Contains no personal information. */
export function generateTicketToken(): string {
  return 'GMY-TKT-' + crypto.randomBytes(20).toString('hex');
}

export function randomId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(8).toString('hex')}`;
}
