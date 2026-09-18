import crypto from 'node:crypto';

function key(): Buffer {
  const value = process.env.PAYMENT_CONFIG_ENCRYPTION_KEY;
  if (!value || value.length < 32) throw new Error('PAYMENT_CONFIG_ENCRYPTION_KEY must be at least 32 characters');
  return crypto.createHash('sha256').update(value).digest();
}

/** Authenticated encryption for write-only gateway secrets stored in PostgreSQL. */
export function encryptPaymentSecret(value: string): string {
  const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', key() as any, iv as any);
  const ciphertext = cipher.update(value, 'utf8', 'base64url') + cipher.final('base64url'); const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext}`;
}
export function decryptPaymentSecret(value: string): string {
  const [ivEncoded, tagEncoded, ciphertext] = value.split('.');
  if (!ivEncoded || !tagEncoded || !ciphertext) throw new Error('Invalid encrypted payment configuration');
  const iv = Buffer.from(ivEncoded, 'base64url'); const tag = Buffer.from(tagEncoded, 'base64url');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key() as any, iv as any); decipher.setAuthTag(tag as any);
  return decipher.update(ciphertext, 'base64url', 'utf8') + decipher.final('utf8');
}
