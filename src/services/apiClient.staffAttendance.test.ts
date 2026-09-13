/* eslint-disable import/first */
jest.mock('../constants/school', () => ({ SCHOOL_ID: 12, API_URL: 'https://pilot.invalid/api/v1' }));
jest.mock('../components/CustomAlert', () => ({ showAlert: jest.fn() }));
jest.mock('@react-native-community/netinfo', () => ({ fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })) }));
jest.mock('./supabaseConfig', () => ({ supabase: { auth: {
  getSession: jest.fn(async () => ({ data: { session: { access_token: 'test-token', expires_at: Date.now() / 1000 + 3600 } } })),
  refreshSession: jest.fn(),
} } }));
jest.mock('./deviceId', () => ({ getOrCreateDeviceId: jest.fn(async () => 'installation-1') }));
jest.mock('./activeContextStore', () => ({ getActiveContextId: jest.fn(async () => null) }));
jest.mock('./staffBiometricService', () => ({ staffBiometricService: {
  getStoredRegistration: jest.fn(), signDeviceSession: jest.fn(),
} }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'nonce-1') }));
import { api } from './apiClient';
import { staffBiometricService } from './staffBiometricService';
import { supabase } from './supabaseConfig';
const pem = '-----BEGIN PUBLIC KEY-----\nABCDEF\n-----END PUBLIC KEY-----';
const fetchMock = global.fetch as jest.Mock;
const response = (status: number, body: unknown) => ({ ok: status < 400, status, headers: { get: () => null }, json: async () => body });
beforeEach(() => {
  jest.clearAllMocks();
  (staffBiometricService.getStoredRegistration as jest.Mock).mockResolvedValue({ keyAlias: 'alias', devicePublicKey: pem, status: 'approved' });
  (staffBiometricService.signDeviceSession as jest.Mock).mockResolvedValue('proof-signature');
  fetchMock.mockResolvedValue(response(200, { success: true, school_id: 12, data: { success: true } }));
});
it('uses single-line key headers and signs the backend-normalized method/path', async () => {
  await api.post('/attendance/v2/challenge', { action: 'check_in' });
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe('https://pilot.invalid/api/v1/attendance/v2/challenge');
  expect(options.headers['X-Device-Session-Key']).not.toMatch(/[\r\n]/);
  expect(options.headers['X-Device-Session-Key'].replace(/\\n/g, '\n')).toBe(pem);
  expect(options.headers['X-Device-Public-Key']).toBe(options.headers['X-Device-Session-Key']);
  expect(options.headers['X-Device-Id']).toBe('installation-1');
  expect(staffBiometricService.signDeviceSession).toHaveBeenCalledWith(
    `staff-device-session:v1:${options.headers['X-Device-Proof-Timestamp']}:nonce-1:POST:/attendance/v2/challenge`, 'alias');
  expect(JSON.parse(options.body)).toMatchObject({ action: 'check_in', school_id: '12' });
});
it.each(['INVALID_SIGNATURE', 'PAYLOAD_CONTEXT_MISMATCH', 'CHALLENGE_NOT_FOUND', 'CHALLENGE_ALREADY_USED', 'CHALLENGE_EXPIRED', 'DEVICE_NOT_APPROVED'])(
  'preserves 401 %s without triggering session recovery', async code => {
    fetchMock.mockResolvedValue(response(401, { error: 'Protocol failed', code }));
    await expect(api.post('/attendance/v2/verify', {})).rejects.toMatchObject({ code, statusCode: 401 });
    expect(supabase.auth.refreshSession).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
it.each([[409, 'POLICY_CHANGED'], [409, 'CHECK_IN_REQUIRED'], [422, 'OUTSIDE_CAMPUS'], [403, 'DEVICE_PROOF_REQUIRED']])(
  'preserves HTTP %s error code %s', async (status, code) => {
    fetchMock.mockResolvedValue(response(Number(status), { error: 'Protocol failed', code }));
    await expect(api.post('/attendance/v2/verify', {}, { silent: true })).rejects.toMatchObject({ code });
  });
it('fails closed when device proof signing fails', async () => {
  jest.useFakeTimers();
  try {
    (staffBiometricService.signDeviceSession as jest.Mock).mockRejectedValue(new Error('key unavailable'));
    await expect(api.post('/attendance/v2/challenge', {})).rejects.toMatchObject({ code: 'DEVICE_PROOF_FAILED' });
    expect(fetchMock).not.toHaveBeenCalled();
  } finally { jest.clearAllTimers(); jest.useRealTimers(); }
});
it('keeps ordinary expired-token recovery available', async () => {
  fetchMock.mockResolvedValueOnce(response(401, { error: 'Unauthorized' }));
  (supabase.auth.refreshSession as jest.Mock).mockResolvedValue({ data: { session: { access_token: 'refreshed', refresh_token: 'refresh' } } });
  await api.post('/attendance/v2/verify', {});
  expect(supabase.auth.refreshSession).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
