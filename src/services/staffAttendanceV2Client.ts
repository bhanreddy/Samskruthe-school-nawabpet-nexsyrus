import * as Location from 'expo-location';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { api, APIError } from './apiClient';
import { staffBiometricService } from './staffBiometricService';
import { AttendanceSigningPayload } from './canonicalPayload';
import { SCHOOL_ID } from '../constants/school';

export interface AuthoritativeTodayStatus {
  attendance_date: string;
  daily_status: string;
  check_in_at: string | null;
  check_out_at: string | null;
  source: string;
  verification_source?: string | null;
  is_verified: boolean;
  is_finalized: boolean;
  campus: { name?: string } | string;
  can_check_in: boolean;
  can_check_out: boolean;
  device_registration_status: 'none' | 'unregistered' | 'pending' | 'approved' | 'rejected' | 'revoked' | 'replaced' | 'invalidated';
  device_registration_id?: string | null;
  device_model: string | null;
  exception_status: 'pending' | 'approved' | 'rejected' | null;
  enforcement_mode: 'disabled' | 'pilot' | 'optional' | 'enforced';
  last_updated_at: string;
}

export type TodayAttendanceStatus = AuthoritativeTodayStatus;

export interface AttendanceVerificationResult {
  success: boolean;
  action: 'check_in' | 'check_out';
  attendanceDate: string;
  eventTimestamp: string;
  verificationStatus: string;
  campus?: string;
  summary: {
    status: string;
    checkInTime: string | null;
    checkOutTime: string | null;
  };
}

export const staffAttendanceV2Client = {
  /**
   * Fetch today's authoritative attendance status from backend.
   */
  async getTodayStatus(): Promise<AuthoritativeTodayStatus> {
    const status = await api.get<AuthoritativeTodayStatus>('/attendance/v2/status/today');
    const local = await staffBiometricService.getStoredRegistration();
    if (local.registrationId === status.device_registration_id && local.status === 'invalidated' &&
        status.device_registration_status === 'approved') {
      // Server approval cannot restore an OS-invalidated private key.
      return { ...status, device_registration_status: 'invalidated', can_check_in: false, can_check_out: false };
    }
    if (
      local.registrationId &&
      status.device_registration_id === local.registrationId &&
      ['pending', 'approved', 'rejected', 'revoked', 'replaced'].includes(status.device_registration_status)
    ) {
      await staffBiometricService.updateRegistrationStatus(
        (status.device_registration_status === 'replaced' ? 'revoked' : status.device_registration_status) as
          'pending' | 'approved' | 'rejected' | 'revoked'
      );
    }
    return status;
  },

  /**
   * Register this mobile device for staff attendance.
   */
  async enrollDevice(staffId: string): Promise<any> {
    if (Platform.OS === 'web') {
      throw new Error('Biometric device registration is not available on web or desktop');
    }

    const capability = await staffBiometricService.getBiometricCapability();
    if (!capability.isAvailable || !capability.hasStrongBiometrics || !capability.enrolled) {
      const err = new Error(
        capability.reason === 'MODULE_NOT_LOADED'
          ? 'This app build does not include staff biometrics. Install the school pilot mobile build.'
          : capability.reason === 'NOT_ENROLLED'
          ? 'No fingerprint or face authentication is enrolled on this phone. Please set up biometrics in device settings.'
          : 'This device does not support Class 3 / Strong biometrics required for staff attendance.'
      );
      (err as any).code = 'BIOMETRIC_UNAVAILABLE';
      throw err;
    }

    // Generate keys in native hardware keystore
    const keys = await staffBiometricService.generateKeysForEnrollment(staffId);

    let registration: any;
    try {
      // Cryptographic proof of possession of the device session key
      const nonce = `proof_${Crypto.randomUUID()}`;
      const proofSignature = await staffBiometricService.signDeviceSession(nonce, keys.keyAlias);

      const payload = {
        device_session_public_key: keys.deviceSessionPublicKey,
        attendance_public_key: keys.attendancePublicKey,
        device_model: `${Platform.OS === 'ios' ? 'Apple iPhone' : 'Android Mobile'}`,
        os_name: Platform.OS,
        os_version: String(Platform.Version),
        app_version: '4.1.8',
        proof_nonce: nonce,
        proof_signature: proofSignature,
      };

      registration = await api.post<any>('/attendance/v2/device/register', payload);
    } catch (error) {
      await staffBiometricService.deleteKeysForAlias(keys.keyAlias).catch(() => {});
      throw error;
    }

    // Store local registration metadata
    await staffBiometricService.saveRegistrationInfo({
      registrationId: registration.id,
      staffId: registration.staff_id,
      personId: registration.canonical_person_id,
      keyAlias: keys.keyAlias,
      devicePublicKey: keys.deviceSessionPublicKey,
      attendancePublicKey: keys.attendancePublicKey,
      status: registration.status,
    });

    return registration;
  },

  /**
   * Complete verified check-in or check-out flow:
   * 1. Get location fix.
   * 2. Request single-use challenge from server.
   * 3. Construct canonical payload.
   * 4. Authenticate & sign with native hardware biometric key.
   * 5. Submit to server and await authoritative confirmation.
   */
  async performAttendanceAction(
    action: 'check_in' | 'check_out',
    onProgress?: (step: string) => void
  ): Promise<AttendanceVerificationResult> {
    if (Platform.OS === 'web') {
      throw new APIError(
        'Staff self-attendance requires the registered mobile app.',
        400,
        undefined,
        undefined,
        'UNSUPPORTED_PLATFORM'
      );
    }

    // Check device registration state
    const today = await this.getTodayStatus();
    if (today.enforcement_mode === 'disabled') {
      throw new APIError('Mobile staff attendance is not enabled for this school.', 403, undefined, undefined, 'ATTENDANCE_V2_DISABLED');
    }
    const stored = await staffBiometricService.getStoredRegistration();
    if (!stored.keyAlias || !stored.staffId || !stored.registrationId || stored.status !== 'approved' ||
        today.device_registration_status !== 'approved' || today.device_registration_id !== stored.registrationId) {
      throw new APIError(
        stored.status === 'pending'
          ? 'Device registration is pending administrator approval.'
          : 'This device is not approved for biometric attendance.',
        403,
        undefined,
        undefined,
        'DEVICE_NOT_APPROVED'
      );
    }

    onProgress?.('Acquiring verified campus GPS fix...');

    // 1. Check & request foreground location permission
    const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
    if (permStatus !== 'granted') {
      throw new APIError(
        'Location permission is required to verify campus presence.',
        403,
        undefined,
        undefined,
        'LOCATION_PERMISSION_DENIED'
      );
    }

    // Capture fresh foreground location
    let locationFix: Location.LocationObject;
    try {
      locationFix = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
      });
    } catch {
      throw new APIError(
        'Unable to acquire GPS reading. Please ensure GPS is enabled and step outside.',
        422,
        undefined,
        undefined,
        'GPS_UNAVAILABLE'
      );
    }

    const { latitude, longitude, accuracy } = locationFix.coords;
    const locationTimestamp = locationFix.timestamp;
    const isMocked = Boolean(locationFix.mocked);
    if (typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy <= 0) {
      throw new APIError(
        'The phone did not provide a reliable GPS accuracy reading. Move to an open area and try again.',
        422,
        undefined,
        undefined,
        'GPS_ACCURACY_UNAVAILABLE'
      );
    }

    onProgress?.('Requesting secure single-use challenge...');

    // 2. Request single-use challenge from server
    const challengeRes = await api.post<{
      challengeId: string;
      challenge: string;
      action: 'check_in' | 'check_out';
      attendanceDate: string;
      policy: {
        campusId: string | null;
        campusName: string;
        maxLocationAgeSeconds: number;
        maxAccuracyMeters: number;
        policyVersion: string;
      };
      registrationId: string;
    }>('/attendance/v2/challenge', { action });

    if (challengeRes.action !== action || challengeRes.registrationId !== stored.registrationId) {
      throw new APIError('The challenge does not match this device and action. Refresh and try again.',
        409, undefined, undefined, 'PAYLOAD_CONTEXT_MISMATCH');
    }

    onProgress?.('Authenticating with biometrics...');

    // 3. Construct signing payload
    const idempotencyKey = Crypto.randomUUID();
    const signingPayload: AttendanceSigningPayload = {
      action,
      campus_id: challengeRes.policy.campusId,
      challenge_id: challengeRes.challengeId,
      idempotency_key: idempotencyKey,
      location: {
        latitude,
        longitude,
        accuracy,
        timestamp: locationTimestamp,
        mocked: isMocked,
      },
      policy_version: challengeRes.policy.policyVersion,
      registration_id: challengeRes.registrationId,
      school_id: Number(SCHOOL_ID),
      staff_id: stored.staffId || '',
    };

    // 4. Native biometric prompt and cryptographic signing
    let signatureResult: { signature: string; canonicalPayload: string };
    try {
      signatureResult = await staffBiometricService.signAttendance(
        signingPayload,
        'Staff Attendance Verification',
        `Authenticate to sign ${action === 'check_in' ? 'check-in' : 'check-out'}`
      );
    } catch (bioErr: any) {
      if (bioErr?.message?.includes('USER_CANCELED') || bioErr?.code === 'USER_CANCELED') {
        throw new APIError(
          'Biometric authentication was cancelled.',
          401,
          undefined,
          undefined,
          'USER_CANCELED'
        );
      }
      if (bioErr?.message?.includes('KEY_PERMANENTLY_INVALIDATED') || ['KEY_PERMANENTLY_INVALIDATED', 'KEY_NOT_FOUND'].includes(bioErr?.code)) {
        throw new APIError(
          'Biometric enrollment was modified on this phone. For your security, device re-registration is required.',
          403,
          undefined,
          undefined,
          'KEY_PERMANENTLY_INVALIDATED'
        );
      }
      throw bioErr;
    }

    onProgress?.('Verifying with school attendance server...');

    // 5. Submit verification payload to backend
    const verification = await api.post<AttendanceVerificationResult>('/attendance/v2/verify', {
      challenge_id: challengeRes.challengeId,
      payload: signingPayload,
      signature: signatureResult.signature,
      idempotency_key: idempotencyKey,
    });

    return verification;
  },

  async performCheckIn(onProgress?: (step: string) => void): Promise<AttendanceVerificationResult> {
    return this.performAttendanceAction('check_in', onProgress);
  },

  async performCheckOut(onProgress?: (step: string) => void): Promise<AttendanceVerificationResult> {
    return this.performAttendanceAction('check_out', onProgress);
  },

  async registerThisDevice(staffId?: string): Promise<any> {
    return this.enrollDevice(staffId || 'me');
  },

  async replaceDevice(staffId?: string): Promise<any> {
    return this.enrollDevice(staffId || 'me');
  },

  /**
   * Submit an attendance exception request.
   */
  async submitException(
    attendanceDate: string,
    action: 'check_in' | 'check_out',
    reason: string
  ): Promise<any> {
    return await api.post('/attendance/v2/exceptions', {
      attendance_date: attendanceDate,
      action,
      reason,
    });
  },
};

export default staffAttendanceV2Client;
