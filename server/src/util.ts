import { HTTPException } from 'hono/http-exception';
import type { ZodType } from 'zod';

export class ApiError extends HTTPException {
  constructor(
    status: 400 | 401 | 403 | 404 | 409 | 410 | 429 | 500,
    readonly code: string,
    message: string,
  ) {
    super(status, { message });
  }
}

export const notFound = (what = 'Không tìm thấy') => new ApiError(404, 'not_found', what);
export const forbidden = (msg = 'Bạn không có quyền làm việc này') => new ApiError(403, 'forbidden', msg);

/** Parse untrusted input; the first issue becomes a Vietnamese 400. */
export function parse<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ApiError(400, 'invalid_input', issue?.message ?? 'Dữ liệu không hợp lệ');
  }
  return result.data;
}

export async function readJson(req: { json(): Promise<unknown> }): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, 'invalid_json', 'Dữ liệu không hợp lệ');
  }
}

export const uuid = () => crypto.randomUUID();

export function sha256(input: string): string {
  return new Bun.CryptoHasher('sha256').update(input).digest('hex');
}

export function randomToken(bytes = 32): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return Buffer.from(buf).toString('base64url');
}

/** Constant-time string compare for equal-length hex digests. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Invite codes avoid 0/O and 1/I/L so they survive being read aloud.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function inviteCode(length = 6): string {
  const buf = crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (const b of buf) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

export function otpCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, '0');
}
