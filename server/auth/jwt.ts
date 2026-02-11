import crypto from 'crypto';

function base64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function signJwt(payload: Record<string, unknown>, secret: string, expiresInSeconds: number): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, exp: now + expiresInSeconds, ...payload } as Record<string, unknown>;

  const headerPart = base64url(JSON.stringify(header));
  const payloadPart = base64url(JSON.stringify(body));
  const data = `${headerPart}.${payloadPart}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest();
  const sigPart = base64url(sig);
  return `${data}.${sigPart}`;
}

export function verifyJwt(token: string, secret: string): { valid: boolean; payload?: Record<string, unknown>; reason?: string } {
  try {
    const [headerPart, payloadPart, sigPart] = token.split('.');
    if (!headerPart || !payloadPart || !sigPart) return { valid: false, reason: 'format' };
    const data = `${headerPart}.${payloadPart}`;
    const expectedSig = base64url(crypto.createHmac('sha256', secret).update(data).digest());
    if (expectedSig !== sigPart) return { valid: false, reason: 'sig' };
    const parsed = JSON.parse(Buffer.from(payloadPart, 'base64').toString('utf8')) as unknown;
    const payload: Record<string, unknown> = (typeof parsed === 'object' && parsed !== null) ? (parsed as Record<string, unknown>) : {};
    const now = Math.floor(Date.now() / 1000);
    const expVal = payload['exp'];
    if (typeof expVal === 'number' && expVal < now) return { valid: false, reason: 'exp' };
    return { valid: true, payload };
  } catch (e) {
    return { valid: false, reason: 'error' };
  }
}
