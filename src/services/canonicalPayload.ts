/**
 * canonicalPayload.ts — Deterministic RFC 8785 JSON Canonicalization Scheme (JCS).
 * Ensures byte-for-byte agreement between mobile signature generation and backend signature verification.
 */

export function canonicalJsonStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => canonicalJsonStringify(item)).join(',') + ']';
  }

  const record = obj as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const pairs: string[] = [];
  for (const key of sortedKeys) {
    const val = record[key];
    if (val !== undefined && typeof val !== 'function' && typeof val !== 'symbol') {
      pairs.push(JSON.stringify(key) + ':' + canonicalJsonStringify(val));
    }
  }

  return '{' + pairs.join(',') + '}';
}

export function canonicalizePayload(payload: unknown): string {
  return canonicalJsonStringify(payload);
}

export const buildCanonicalAttendancePayload = canonicalJsonStringify;

export interface AttendancePayloadLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  mocked: boolean;
}

export interface AttendanceSigningPayload {
  action: 'check_in' | 'check_out';
  campus_id: string | null;
  challenge_id: string;
  idempotency_key: string;
  location: AttendancePayloadLocation;
  policy_version: string;
  registration_id: string;
  school_id: number;
  staff_id: string;
}
