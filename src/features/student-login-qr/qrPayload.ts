import { z } from 'zod';

export const SCHOOLIMS_LOGIN_QR_TYPE = 'SCHOOLIMS_LOGIN' as const;
export const SCHOOLIMS_LOGIN_QR_VERSION = 1 as const;

const qrSchema = z.object({
  type: z.literal(SCHOOLIMS_LOGIN_QR_TYPE),
  version: z.literal(SCHOOLIMS_LOGIN_QR_VERSION),
  schoolId: z.coerce.number().int().positive(),
  payload: z.string().regex(/^[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/i),
});

export type SchoolIMSLoginQr = z.infer<typeof qrSchema>;

export class QrPayloadError extends Error {
  constructor(public code: 'INVALID' | 'WRONG_TYPE' | 'UNSUPPORTED_VERSION' | 'QR_SCHOOL_MISMATCH') {
    super(code);
    this.name = 'QrPayloadError';
  }
}

function firstNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

/**
 * Camera libraries return the QR text in `data`, `raw`, or a nested nativeEvent.
 * Web jsQR may also hand back an already-parsed JSON object.
 */
export function extractScannedLoginQrText(scan: unknown): string {
  if (typeof scan === 'string') {
    const trimmed = scan.replace(/^\uFEFF/, '').trim();
    if (trimmed) return trimmed;
    throw new QrPayloadError('INVALID');
  }
  if (!scan || typeof scan !== 'object') throw new QrPayloadError('INVALID');
  const result = scan as Record<string, unknown>;
  const nested = result.nativeEvent && typeof result.nativeEvent === 'object'
    ? result.nativeEvent as Record<string, unknown>
    : null;

  const objectCandidate = [result, nested].find((value) => (
    value
    && value.type === SCHOOLIMS_LOGIN_QR_TYPE
    && typeof value.payload === 'string'
  ));
  if (objectCandidate) return JSON.stringify(objectCandidate);

  const text = firstNonEmptyString(
    result.raw,
    result.data,
    nested?.raw,
    nested?.data,
  );
  if (!text) throw new QrPayloadError('INVALID');
  return text.replace(/^\uFEFF/, '').trim();
}

export function parseSchoolIMSLoginQr(raw: string): SchoolIMSLoginQr {
  const text = extractScannedLoginQrText(raw);
  if (text.length > 2048) throw new QrPayloadError('INVALID');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
  } catch {
    throw new QrPayloadError('INVALID');
  }
  if (!parsed || typeof parsed !== 'object' || (parsed as { type?: unknown }).type !== SCHOOLIMS_LOGIN_QR_TYPE) {
    throw new QrPayloadError('WRONG_TYPE');
  }
  if ((parsed as { version?: unknown }).version !== SCHOOLIMS_LOGIN_QR_VERSION) {
    throw new QrPayloadError('UNSUPPORTED_VERSION');
  }
  const result = qrSchema.safeParse(parsed);
  if (!result.success) throw new QrPayloadError('INVALID');
  return result.data;
}

export function loginQrCredentialFingerprint(payload: string): string {
  const separator = payload.indexOf('.');
  const credentialId = separator > 0 ? payload.slice(0, separator) : payload;
  return credentialId.slice(0, 8);
}
