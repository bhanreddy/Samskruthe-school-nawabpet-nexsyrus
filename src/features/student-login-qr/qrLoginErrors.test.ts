jest.mock('../../services/apiClient', () => {
  class APIError extends Error {
    statusCode?: number;
    code?: string;
    constructor(message: string, status?: number, _errors?: unknown, _requestId?: string, code?: string) {
      super(message);
      this.name = 'APIError';
      this.statusCode = status;
      this.code = code;
    }
  }
  return { APIError };
});

import { APIError } from '../../services/apiClient';
import { LOGIN_QR_USER_ERRORS, messageForQrLoginFailure } from './qrLoginErrors';
import { QrPayloadError } from './qrPayload';

describe('QR login user errors', () => {
  it('rejects invalid, malformed, and unsupported payloads without raw codes', () => {
    expect(messageForQrLoginFailure(new QrPayloadError('INVALID'))).toBe(LOGIN_QR_USER_ERRORS.INVALID);
    expect(messageForQrLoginFailure(new QrPayloadError('WRONG_TYPE'))).toBe(LOGIN_QR_USER_ERRORS.INVALID);
    expect(messageForQrLoginFailure(new QrPayloadError('UNSUPPORTED_VERSION'))).toBe(LOGIN_QR_USER_ERRORS.INVALID);
    expect(messageForQrLoginFailure(new APIError('nope', 400, undefined, undefined, 'NOT_SCHOOLIMS_LOGIN_QR')))
      .toBe(LOGIN_QR_USER_ERRORS.INVALID);
    expect(messageForQrLoginFailure(new APIError('bad', 400, undefined, undefined, 'QR_MALFORMED')))
      .toBe(LOGIN_QR_USER_ERRORS.INVALID);
  });

  it('maps backend validation stages to specific user messages', () => {
    expect(messageForQrLoginFailure(new APIError('gone', 401, undefined, undefined, 'QR_TOKEN_EXPIRED')))
      .toBe(LOGIN_QR_USER_ERRORS.EXPIRED);
    expect(messageForQrLoginFailure(new APIError('gone', 401, undefined, undefined, 'LOGIN_QR_NO_LONGER_VALID')))
      .toBe(LOGIN_QR_USER_ERRORS.EXPIRED);
    expect(messageForQrLoginFailure(new APIError('revoked', 401, undefined, undefined, 'QR_TOKEN_REVOKED')))
      .toBe(LOGIN_QR_USER_ERRORS.REVOKED);
    expect(messageForQrLoginFailure(new APIError('used', 401, undefined, undefined, 'QR_TOKEN_ALREADY_USED')))
      .toBe(LOGIN_QR_USER_ERRORS.ALREADY_USED);
    expect(messageForQrLoginFailure(new QrPayloadError('QR_SCHOOL_MISMATCH')))
      .toBe(LOGIN_QR_USER_ERRORS.SCHOOL_MISMATCH);
    expect(messageForQrLoginFailure(new APIError('inactive', 401, undefined, undefined, 'QR_USER_INACTIVE')))
      .toBe(LOGIN_QR_USER_ERRORS.USER_INACTIVE);
    expect(messageForQrLoginFailure(new APIError('session', 503, undefined, undefined, 'QR_SESSION_CREATE_FAILED')))
      .toBe(LOGIN_QR_USER_ERRORS.SESSION);
  });

  it('never surfaces backend or Supabase text', () => {
    expect(messageForQrLoginFailure(new Error('Supabase Auth JWT expired'))).toBe(LOGIN_QR_USER_ERRORS.UNAVAILABLE);
    expect(messageForQrLoginFailure(new APIError('too many', 429))).toBe(LOGIN_QR_USER_ERRORS.UNAVAILABLE);
    expect(messageForQrLoginFailure(new APIError('offline', 0))).toBe(LOGIN_QR_USER_ERRORS.NETWORK);
    expect(messageForQrLoginFailure(new APIError('timeout', 408))).toBe(LOGIN_QR_USER_ERRORS.TIMEOUT);
  });
});
