import { z } from 'zod';

export const SCHOOLIMS_LOGIN_QR_TYPE = 'SCHOOLIMS_LOGIN' as const;
export const SCHOOLIMS_LOGIN_QR_VERSION = 1 as const;

const qrSchema = z.object({
  type: z.literal(SCHOOLIMS_LOGIN_QR_TYPE),
  version: z.literal(SCHOOLIMS_LOGIN_QR_VERSION),
  schoolId: z.number().int().positive(),
  payload: z.string().regex(/^[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/i),
}).strict();

export type SchoolIMSLoginQr = z.infer<typeof qrSchema>;

export class QrPayloadError extends Error {
  constructor(public code: 'INVALID' | 'WRONG_TYPE' | 'UNSUPPORTED_VERSION') {
    super(code);
    this.name = 'QrPayloadError';
  }
}

export function parseSchoolIMSLoginQr(raw: string): SchoolIMSLoginQr {
  if (typeof raw !== 'string' || raw.length > 2048) throw new QrPayloadError('INVALID');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
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
