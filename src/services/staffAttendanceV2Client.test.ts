/* eslint-disable import/first, @typescript-eslint/no-require-imports */
jest.mock('../constants/school', () => ({ SCHOOL_ID: 12 }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn() }));
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(), getCurrentPositionAsync: jest.fn(), Accuracy: { High: 4 },
}));
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => { store.set(key, value); }),
    deleteItemAsync: jest.fn(async (key: string) => { store.delete(key); }),
  };
});
jest.mock('../../modules/staff-biometrics', () => ({ StaffBiometrics: {
  checkBiometricCapability: jest.fn(), generateAttendanceKey: jest.fn(), generateDeviceSessionKey: jest.fn(),
  signWithBiometric: jest.fn(), signWithDeviceSessionKey: jest.fn(), deleteKeys: jest.fn(),
} }));
jest.mock('./apiClient', () => ({
  api: { get: jest.fn(), post: jest.fn() },
  APIError: class extends Error {
    statusCode: number; code?: string;
    constructor(message: string, statusCode: number, _errors?: unknown, _requestId?: string, code?: string) { super(message); this.statusCode = statusCode; this.code = code; }
  },
}));
import { Platform } from 'react-native';
import { staffAttendanceV2Client as client } from './staffAttendanceV2Client';
import { staffBiometricService as biometrics } from './staffBiometricService';
import { canonicalJsonStringify } from './canonicalPayload';
import { api, APIError } from './apiClient';
const native = require('../../modules/staff-biometrics').StaffBiometrics;
const location = require('expo-location');
const secure = require('expo-secure-store');
const crypto = require('expo-crypto');
const get = api.get as jest.Mock;
const post = api.post as jest.Mock;
const registration = { id: 'reg-1', staff_id: 'staff-1', canonical_person_id: 'person-1', status: 'pending' };
let status: any;
let challenge: any;
let fix: any;
const receipt = { success: true, action: 'check_in', eventTimestamp: '2026-09-10T04:00:00Z', summary: { status: 'present' } };

beforeEach(() => {
  jest.resetAllMocks();
  secure.__store.clear();
  secure.getItemAsync.mockImplementation(async (key: string) => secure.__store.get(key) ?? null);
  secure.setItemAsync.mockImplementation(async (key: string, value: string) => { secure.__store.set(key, value); });
  Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  let sequence = 0;
  crypto.randomUUID.mockImplementation(() => `uuid-${++sequence}`);
  status = { device_registration_status: 'approved', device_registration_id: 'reg-1', enforcement_mode: 'pilot', can_check_in: true, can_check_out: false };
  challenge = { challengeId: 'challenge-1', challenge: 'nonce', action: 'check_in', registrationId: 'reg-1',
    policy: { campusId: 'campus-1', policyVersion: 'v1', maxLocationAgeSeconds: 30, maxAccuracyMeters: 50 } };
  fix = { coords: { latitude: 17.385, longitude: 78.486, accuracy: 10 }, timestamp: Date.now(), mocked: false };
  location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
  location.getCurrentPositionAsync.mockImplementation(async () => fix);
  native.checkBiometricCapability.mockResolvedValue({ isAvailable: true, hasStrongBiometrics: true, enrolled: true });
  native.generateAttendanceKey.mockResolvedValue({ publicKey: 'attendance-pem' });
  native.generateDeviceSessionKey.mockResolvedValue({ publicKey: 'session-pem' });
  native.signWithDeviceSessionKey.mockResolvedValue({ signature: 'proof-signature' });
  native.signWithBiometric.mockResolvedValue({ signature: 'attendance-signature' });
  native.deleteKeys.mockResolvedValue(true);
  get.mockImplementation(async () => ({ ...status }));
  post.mockImplementation(async (path: string) => {
    if (path.endsWith('/register')) return registration;
    if (path.endsWith('/challenge')) return challenge;
    return receipt;
  });
});

async function approve() {
  await client.enrollDevice('staff-1');
  await client.getTodayStatus();
  jest.clearAllMocks();
}

describe('registration and approval', () => {
  it.each(['android', 'ios'])('enrolls %s with dual keys, possession proof, and server-owned identity', async os => {
    Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
    await client.enrollDevice('alias-only');
    const stored = await biometrics.getStoredRegistration();
    expect(stored).toMatchObject({ registrationId: 'reg-1', staffId: 'staff-1', personId: 'person-1', status: 'pending' });
    expect(post).toHaveBeenCalledWith('/attendance/v2/device/register', expect.objectContaining({
      device_session_public_key: 'session-pem', attendance_public_key: 'attendance-pem', os_name: os,
      proof_signature: 'proof-signature', proof_nonce: expect.any(String),
    }));
    expect(native.signWithDeviceSessionKey).toHaveBeenCalledWith(stored.keyAlias, expect.stringMatching(/^proof_/));
    await client.getTodayStatus();
    expect((await biometrics.getStoredRegistration()).status).toBe('approved');
  });
  it.each(['web', 'weak', 'not-enrolled', 'module-missing'])('blocks unsupported enrollment: %s', async mode => {
    if (mode === 'web') Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    else native.checkBiometricCapability.mockResolvedValue({ hasStrongBiometrics: mode === 'not-enrolled', enrolled: false });
    await expect(client.enrollDevice('staff-1')).rejects.toThrow();
    expect(native.generateAttendanceKey).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });
  it.each(['proof', 'registration'])('cleans new keys after %s failure, preserving prior registration', async stage => {
    await approve();
    const old = await biometrics.getStoredRegistration();
    if (stage === 'proof') native.signWithDeviceSessionKey.mockRejectedValueOnce(new Error('proof failed'));
    else post.mockRejectedValueOnce(new Error('registration failed'));
    await expect(client.replaceDevice()).rejects.toThrow();
    expect(native.deleteKeys).toHaveBeenCalledTimes(1);
    expect(native.deleteKeys).not.toHaveBeenCalledWith(old.keyAlias);
    expect(await biometrics.getStoredRegistration()).toEqual(old);
  });
  it('preserves the complete prior registration if replacement metadata cannot be saved', async () => {
    await approve();
    const old = await biometrics.getStoredRegistration();
    secure.setItemAsync.mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(client.replaceDevice()).rejects.toThrow('storage unavailable');
    expect(await biometrics.getStoredRegistration()).toEqual(old);
  });
  it.each(['null', '{}', 'not-json'])('fails closed on corrupt registration metadata %s', async saved => {
    secure.__store.set('staff_att_v2_registration', saved);
    await expect(biometrics.getStoredRegistration()).resolves.toMatchObject({ status: 'unregistered', keyAlias: null });
  });
  it('cleans up partial key generation only after both native operations settle', async () => {
    let finish!: (value: any) => void;
    native.generateAttendanceKey.mockRejectedValueOnce(new Error('hardware unavailable'));
    native.generateDeviceSessionKey.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const enrollment = client.enrollDevice('staff-1');
    await Promise.resolve(); await Promise.resolve();
    expect(native.deleteKeys).not.toHaveBeenCalled();
    finish({ publicKey: 'session-pem' });
    await expect(enrollment).rejects.toThrow('hardware unavailable');
    expect(native.deleteKeys).toHaveBeenCalledTimes(1);
    expect(post).not.toHaveBeenCalled();
  });
});

describe('signed attendance protocol', () => {
  it.each(['check_in', 'check_out'] as const)('signs and submits exactly the same %s payload', async action => {
    await approve();
    challenge.action = action;
    const result = await client.performAttendanceAction(action);
    const body = post.mock.calls.find(([path]) => path.endsWith('/verify'))![1];
    expect(body.payload).toEqual({ action, campus_id: 'campus-1', challenge_id: 'challenge-1',
      registration_id: 'reg-1', school_id: 12, staff_id: 'staff-1', policy_version: 'v1',
      idempotency_key: body.idempotency_key, location: { ...fix.coords, timestamp: fix.timestamp, mocked: false } });
    expect(native.signWithBiometric).toHaveBeenCalledWith(expect.any(String), canonicalJsonStringify(body.payload), expect.any(String), expect.any(String));
    expect(body.signature).toBe('attendance-signature');
    expect(result).toBe(receipt);
  });
  it.each(['pending', 'rejected', 'revoked', 'replaced', 'none'])('stops %s devices before GPS or signing', async state => {
    await approve(); status.device_registration_status = state;
    await expect(client.performCheckIn()).rejects.toMatchObject({ code: 'DEVICE_NOT_APPROVED' });
    expect(location.getCurrentPositionAsync).not.toHaveBeenCalled();
    expect(native.signWithBiometric).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });
  it('does not trust a different registration even when the local record says approved', async () => {
    await approve(); status.device_registration_id = 'other-device';
    await expect(client.performCheckIn()).rejects.toMatchObject({ code: 'DEVICE_NOT_APPROVED' });
    expect(post).not.toHaveBeenCalled();
  });
  it('keeps enforcement disabled before acquiring location', async () => {
    await approve(); status.enforcement_mode = 'disabled';
    await expect(client.performCheckIn()).rejects.toMatchObject({ code: 'ATTENDANCE_V2_DISABLED' });
    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });
  it.each(['action', 'registrationId'])('rejects a challenge with mismatched %s before signing', async field => {
    await approve(); challenge[field] = 'other';
    await expect(client.performCheckIn()).rejects.toMatchObject({ code: 'PAYLOAD_CONTEXT_MISMATCH' });
    expect(native.signWithBiometric).not.toHaveBeenCalled();
  });
  it.each(['USER_CANCELED', 'LOCKOUT', 'KEY_PERMANENTLY_INVALIDATED', 'KEY_NOT_FOUND'])('handles native %s without submitting', async code => {
    await approve(); native.signWithBiometric.mockRejectedValueOnce(Object.assign(new Error(code), { code }));
    await expect(client.performCheckIn()).rejects.toThrow();
    expect(post.mock.calls.some(([path]) => path.endsWith('/verify'))).toBe(false);
    const invalidated = code.startsWith('KEY_');
    expect((await biometrics.getStoredRegistration()).status).toBe(invalidated ? 'invalidated' : 'approved');
    const refreshed = await client.getTodayStatus();
    expect(refreshed.device_registration_status).toBe(invalidated ? 'invalidated' : 'approved');
    if (invalidated) expect(refreshed.can_check_in).toBe(false);
  });
  it.each(['OUTSIDE_CAMPUS', 'LOCATION_UNCERTAIN_AT_BOUNDARY', 'POOR_GPS_ACCURACY', 'LOCATION_TOO_OLD',
    'LOCATION_IN_FUTURE', 'MOCK_LOCATION_DETECTED', 'CHALLENGE_EXPIRED', 'CHALLENGE_ALREADY_USED',
    'INVALID_SIGNATURE', 'DEVICE_NOT_APPROVED', 'POLICY_CHANGED', 'CHECK_IN_REQUIRED', 'ALREADY_CHECKED_IN'])('preserves server rejection %s and never reports success', async code => {
    await approve();
    const error = new APIError(code, 422, undefined, undefined, code);
    post.mockImplementation(async (path: string) => { if (path.endsWith('/challenge')) return challenge; throw error; });
    await expect(client.performCheckIn()).rejects.toBe(error);
    expect(post).toHaveBeenCalledTimes(2);
  });
  it('forwards mocked location evidence for server rejection', async () => {
    await approve(); fix.mocked = true;
    await client.performCheckIn();
    expect(post.mock.calls[1][1].payload.location.mocked).toBe(true);
  });
  it('fails on denied permission without requesting a challenge', async () => {
    await approve(); location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
    await expect(client.performCheckIn()).rejects.toMatchObject({ code: 'LOCATION_PERMISSION_DENIED' });
    expect(post).not.toHaveBeenCalled();
  });
  it('fails on GPS acquisition error without requesting a challenge', async () => {
    await approve(); location.getCurrentPositionAsync.mockRejectedValue(new Error('GPS off'));
    await expect(client.performCheckIn()).rejects.toMatchObject({ code: 'GPS_UNAVAILABLE' });
    expect(post).not.toHaveBeenCalled();
  });
  it.each([null, undefined, 0, -1, NaN, Infinity])('rejects unusable GPS accuracy %s', async accuracy => {
    await approve(); fix.coords.accuracy = accuracy;
    await expect(client.performCheckIn()).rejects.toMatchObject({ code: 'GPS_ACCURACY_UNAVAILABLE' });
    expect(post).not.toHaveBeenCalled();
  });
  it('blocks web attendance even with previously stored approval', async () => {
    await approve(); Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    await expect(client.performCheckIn()).rejects.toMatchObject({ code: 'UNSUPPORTED_PLATFORM' });
    expect(get).not.toHaveBeenCalled(); expect(post).not.toHaveBeenCalled();
  });
  it('submits an exception without biometric success or a local attendance receipt', async () => {
    await client.submitException('2026-09-10', 'check_out', 'GPS unavailable');
    expect(post).toHaveBeenCalledWith('/attendance/v2/exceptions', { attendance_date: '2026-09-10', action: 'check_out', reason: 'GPS unavailable' });
    expect(native.signWithBiometric).not.toHaveBeenCalled();
  });
});
