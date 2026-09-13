import { APIError } from '../../services/apiClient';
import { QrPayloadError } from './qrPayload';

export const LOGIN_QR_USER_ERRORS = {
  INVALID: 'This is not a valid SchoolIMS login QR.',
  EXPIRED: 'This login QR is no longer valid. Please request a new QR from your school.',
  CAMERA: 'Camera access is required to scan your login QR.',
  NETWORK: 'Internet connection is required for QR login.',
  AUTH: 'Unable to sign in using this QR. Please contact your school administrator.',
  UNAVAILABLE: 'QR login is temporarily unavailable. Please wait and try again.',
} as const;

const INVALID_CODES = new Set([
  'INVALID',
  'WRONG_TYPE',
  'INVALID_LOGIN_QR',
  'NOT_SCHOOLIMS_LOGIN_QR',
  'UNSUPPORTED_VERSION',
  'UNSUPPORTED_LOGIN_QR_VERSION',
]);

const EXPIRED_CODES = new Set([
  'LOGIN_QR_NO_LONGER_VALID',
  'LOGIN_QR_SCHOOL_MISMATCH',
  'LOGIN_QR_KEY_ROTATED',
]);

export function messageForQrLoginFailure(error: unknown): string {
  if (error instanceof QrPayloadError) {
    return INVALID_CODES.has(error.code) ? LOGIN_QR_USER_ERRORS.INVALID : LOGIN_QR_USER_ERRORS.AUTH;
  }

  const code = error instanceof APIError ? error.code : undefined;
  const status = error instanceof APIError ? error.statusCode : undefined;
  const raw = error instanceof Error ? error.message : '';

  if (code && INVALID_CODES.has(code)) return LOGIN_QR_USER_ERRORS.INVALID;
  if (code && EXPIRED_CODES.has(code)) return LOGIN_QR_USER_ERRORS.EXPIRED;
  if (status === 0 || /internet connection is required/i.test(raw)) return LOGIN_QR_USER_ERRORS.NETWORK;
  if (status === 503 || status === 429 || code === 'QR_LOGIN_UNAVAILABLE' || code === 'LOGIN_QR_NOT_CONFIGURED') {
    return LOGIN_QR_USER_ERRORS.UNAVAILABLE;
  }
  if (INVALID_CODES.has(raw) || /not a valid schoolims login qr/i.test(raw)) return LOGIN_QR_USER_ERRORS.INVALID;
  if (/no longer valid/i.test(raw)) return LOGIN_QR_USER_ERRORS.EXPIRED;
  if (/unable to sign in/i.test(raw)) return LOGIN_QR_USER_ERRORS.AUTH;
  if (raw && !/supabase|postgres|jwt|token_hash|hashed_token/i.test(raw)) {
    if (raw === 'INVALID' || raw === 'WRONG_TYPE' || raw === 'UNSUPPORTED_VERSION') return LOGIN_QR_USER_ERRORS.INVALID;
  }
  return LOGIN_QR_USER_ERRORS.AUTH;
}
