import { APIError } from '../../services/apiClient';
import { QrPayloadError } from './qrPayload';

export const LOGIN_QR_USER_ERRORS = {
  INVALID: 'This QR code is not a valid SchoolIMS login QR.',
  EXPIRED: 'This QR code has expired. Please generate a new QR.',
  REVOKED: 'This QR code has been revoked by your school administrator.',
  ALREADY_USED: 'This login QR is no longer valid. Please request a new QR from your school.',
  SCHOOL_MISMATCH: 'This QR belongs to another school.',
  USER_INACTIVE: 'This account is currently inactive.',
  LOGIN_NOT_ALLOWED: 'QR login is not allowed for this account.',
  CAMERA: 'Camera access is required to scan your login QR.',
  NETWORK: 'Unable to reach SchoolIMS. Check your internet connection and try again.',
  TIMEOUT: 'SchoolIMS took too long to respond. Please try again.',
  SESSION: "We couldn't complete the login. Please try again.",
  AUTH: 'Unable to sign in using this QR. Please contact your school administrator.',
  UNAVAILABLE: "We couldn't complete QR login right now. Please try again.",
} as const;

const MESSAGE_BY_CODE: Record<string, string> = {
  INVALID: LOGIN_QR_USER_ERRORS.INVALID,
  WRONG_TYPE: LOGIN_QR_USER_ERRORS.INVALID,
  UNSUPPORTED_VERSION: LOGIN_QR_USER_ERRORS.INVALID,
  INVALID_LOGIN_QR: LOGIN_QR_USER_ERRORS.INVALID,
  NOT_SCHOOLIMS_LOGIN_QR: LOGIN_QR_USER_ERRORS.INVALID,
  UNSUPPORTED_LOGIN_QR_VERSION: LOGIN_QR_USER_ERRORS.INVALID,
  QR_INVALID: LOGIN_QR_USER_ERRORS.INVALID,
  QR_MALFORMED: LOGIN_QR_USER_ERRORS.INVALID,
  QR_TOKEN_NOT_FOUND: LOGIN_QR_USER_ERRORS.INVALID,
  QR_TOKEN_EXPIRED: LOGIN_QR_USER_ERRORS.EXPIRED,
  LOGIN_QR_NO_LONGER_VALID: LOGIN_QR_USER_ERRORS.EXPIRED,
  QR_EXPIRED: LOGIN_QR_USER_ERRORS.EXPIRED,
  QR_TOKEN_REVOKED: LOGIN_QR_USER_ERRORS.REVOKED,
  QR_REVOKED: LOGIN_QR_USER_ERRORS.REVOKED,
  LOGIN_QR_KEY_ROTATED: LOGIN_QR_USER_ERRORS.REVOKED,
  QR_TOKEN_ALREADY_USED: LOGIN_QR_USER_ERRORS.ALREADY_USED,
  QR_SCHOOL_MISMATCH: LOGIN_QR_USER_ERRORS.SCHOOL_MISMATCH,
  LOGIN_QR_SCHOOL_MISMATCH: LOGIN_QR_USER_ERRORS.SCHOOL_MISMATCH,
  QR_SCHOOL_NOT_FOUND: LOGIN_QR_USER_ERRORS.SCHOOL_MISMATCH,
  QR_USER_NOT_FOUND: LOGIN_QR_USER_ERRORS.AUTH,
  QR_USER_INACTIVE: LOGIN_QR_USER_ERRORS.USER_INACTIVE,
  QR_LOGIN_NOT_ALLOWED: LOGIN_QR_USER_ERRORS.LOGIN_NOT_ALLOWED,
  QR_SESSION_CREATE_FAILED: LOGIN_QR_USER_ERRORS.SESSION,
  QR_SERVER_ERROR: LOGIN_QR_USER_ERRORS.UNAVAILABLE,
  QR_LOGIN_UNAVAILABLE: LOGIN_QR_USER_ERRORS.UNAVAILABLE,
  LOGIN_QR_NOT_CONFIGURED: LOGIN_QR_USER_ERRORS.UNAVAILABLE,
  NETWORK_ERROR: LOGIN_QR_USER_ERRORS.NETWORK,
  UNKNOWN_ERROR: LOGIN_QR_USER_ERRORS.UNAVAILABLE,
};

export function messageForQrLoginFailure(error: unknown): string {
  if (error instanceof QrPayloadError) {
    return MESSAGE_BY_CODE[error.code] || LOGIN_QR_USER_ERRORS.INVALID;
  }

  const code = error instanceof APIError
    ? error.code
    : (error && typeof error === 'object' && 'code' in error ? String((error as { code?: unknown }).code || '') : undefined);
  const status = error instanceof APIError ? error.statusCode : undefined;
  const raw = error instanceof Error ? error.message : '';

  if (code && MESSAGE_BY_CODE[code]) return MESSAGE_BY_CODE[code];
  if (status === 0 || /internet connection is required|unable to (reach|connect)|network/i.test(raw)) {
    return LOGIN_QR_USER_ERRORS.NETWORK;
  }
  if (status === 408 || /timed out|timeout/i.test(raw)) return LOGIN_QR_USER_ERRORS.TIMEOUT;
  if (status === 503 || status === 429 || status === 502 || status === 504) {
    return LOGIN_QR_USER_ERRORS.UNAVAILABLE;
  }
  if (/not a valid schoolims login qr/i.test(raw)) return LOGIN_QR_USER_ERRORS.INVALID;
  if (/has expired|no longer valid/i.test(raw)) return LOGIN_QR_USER_ERRORS.EXPIRED;
  if (/belongs to another school/i.test(raw)) return LOGIN_QR_USER_ERRORS.SCHOOL_MISMATCH;
  if (/currently inactive/i.test(raw)) return LOGIN_QR_USER_ERRORS.USER_INACTIVE;
  if (/couldn't complete the login/i.test(raw)) return LOGIN_QR_USER_ERRORS.SESSION;
  if (/unable to sign in/i.test(raw)) return LOGIN_QR_USER_ERRORS.AUTH;
  if (raw === LOGIN_QR_USER_ERRORS.INVALID) return LOGIN_QR_USER_ERRORS.INVALID;
  if (raw === LOGIN_QR_USER_ERRORS.NETWORK) return LOGIN_QR_USER_ERRORS.NETWORK;
  if (raw === LOGIN_QR_USER_ERRORS.SCHOOL_MISMATCH) return LOGIN_QR_USER_ERRORS.SCHOOL_MISMATCH;
  return LOGIN_QR_USER_ERRORS.UNAVAILABLE;
}
