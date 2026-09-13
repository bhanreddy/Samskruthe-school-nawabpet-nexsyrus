import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { StaffBiometrics, BiometricCapability } from '../../modules/staff-biometrics';
import { buildCanonicalAttendancePayload, AttendanceSigningPayload } from './canonicalPayload';

const STORAGE_PREFIX = 'staff_att_v2_';
const REGISTRATION_INFO_KEY = `${STORAGE_PREFIX}registration`;
const REGISTRATION_ID_KEY = `${STORAGE_PREFIX}reg_id`;
const STAFF_ID_KEY = `${STORAGE_PREFIX}staff_id`;
const CANONICAL_PERSON_ID_KEY = `${STORAGE_PREFIX}person_id`;
const KEY_ALIAS_KEY = `${STORAGE_PREFIX}key_alias`;
const DEVICE_PUBLIC_KEY_KEY = `${STORAGE_PREFIX}dev_pub_key`;
const ATTENDANCE_PUBLIC_KEY_KEY = `${STORAGE_PREFIX}att_pub_key`;
const REGISTRATION_STATUS_KEY = `${STORAGE_PREFIX}status`;

export interface StoredRegistrationInfo {
  registrationId: string | null;
  staffId: string | null;
  personId: string | null;
  keyAlias: string | null;
  devicePublicKey: string | null;
  attendancePublicKey: string | null;
  status: 'unregistered' | 'pending' | 'approved' | 'rejected' | 'revoked' | 'invalidated';
}

export const staffBiometricService = {
  async getBiometricCapability(): Promise<BiometricCapability> {
    return await StaffBiometrics.checkBiometricCapability();
  },

  async getStoredRegistration(): Promise<StoredRegistrationInfo> {
    if (Platform.OS === 'web') {
      return {
        registrationId: null,
        staffId: null,
        personId: null,
        keyAlias: null,
        devicePublicKey: null,
        attendancePublicKey: null,
        status: 'unregistered',
      };
    }

    try {
      const saved = await SecureStore.getItemAsync(REGISTRATION_INFO_KEY);
      if (saved) {
        const info = JSON.parse(saved);
        if (!info || typeof info !== 'object' ||
            !['unregistered', 'pending', 'approved', 'rejected', 'revoked', 'invalidated'].includes(info.status) ||
            ['registrationId', 'staffId', 'personId', 'keyAlias', 'devicePublicKey', 'attendancePublicKey']
              .some((field) => info[field] !== null && typeof info[field] !== 'string')) {
          throw new Error('Invalid registration metadata');
        }
        return info as StoredRegistrationInfo;
      }
      const [
        registrationId,
        staffId,
        personId,
        keyAlias,
        devicePublicKey,
        attendancePublicKey,
        status,
      ] = await Promise.all([
        SecureStore.getItemAsync(REGISTRATION_ID_KEY),
        SecureStore.getItemAsync(STAFF_ID_KEY),
        SecureStore.getItemAsync(CANONICAL_PERSON_ID_KEY),
        SecureStore.getItemAsync(KEY_ALIAS_KEY),
        SecureStore.getItemAsync(DEVICE_PUBLIC_KEY_KEY),
        SecureStore.getItemAsync(ATTENDANCE_PUBLIC_KEY_KEY),
        SecureStore.getItemAsync(REGISTRATION_STATUS_KEY),
      ]);

      return {
        registrationId,
        staffId,
        personId,
        keyAlias,
        devicePublicKey,
        attendancePublicKey,
        status: (status as any) || 'unregistered',
      };
    } catch {
      return {
        registrationId: null,
        staffId: null,
        personId: null,
        keyAlias: null,
        devicePublicKey: null,
        attendancePublicKey: null,
        status: 'unregistered',
      };
    }
  },

  async saveRegistrationInfo(info: {
    registrationId: string;
    staffId: string;
    personId: string;
    keyAlias: string;
    devicePublicKey: string;
    attendancePublicKey: string;
    status: 'pending' | 'approved';
  }): Promise<void> {
    if (Platform.OS === 'web') return;

    // One protected write prevents mixed old/new aliases and approval state if
    // storage fails midway through replacement. Legacy records remain readable.
    await SecureStore.setItemAsync(REGISTRATION_INFO_KEY, JSON.stringify(info));
  },

  async updateRegistrationStatus(
    status: 'unregistered' | 'pending' | 'approved' | 'rejected' | 'revoked' | 'invalidated'
  ): Promise<void> {
    if (Platform.OS === 'web') return;
    const registration = await this.getStoredRegistration();
    await SecureStore.setItemAsync(REGISTRATION_INFO_KEY, JSON.stringify({ ...registration, status }));
  },

  async generateKeysForEnrollment(aliasSuffix: string): Promise<{
    attendancePublicKey: string;
    deviceSessionPublicKey: string;
    keyAlias: string;
  }> {
    const alias = `staff_${aliasSuffix}_${Crypto.randomUUID()}`;
    // Wait for both operations to settle before cleanup so a late key creation
    // cannot leave an orphan after its sibling fails.
    const results = await Promise.allSettled([
      StaffBiometrics.generateAttendanceKey(alias),
      StaffBiometrics.generateDeviceSessionKey(alias),
    ]);
    const failure = results.find((result) => result.status === 'rejected');
    if (failure?.status === 'rejected') {
      await this.deleteKeysForAlias(alias).catch(() => {});
      throw failure.reason;
    }
    const attResult = (results[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof StaffBiometrics.generateAttendanceKey>>>).value;
    const devResult = (results[1] as PromiseFulfilledResult<Awaited<ReturnType<typeof StaffBiometrics.generateDeviceSessionKey>>>).value;

    return {
      attendancePublicKey: attResult.publicKey,
      deviceSessionPublicKey: devResult.publicKey,
      keyAlias: alias,
    };
  },

  async signAttendance(
    payload: AttendanceSigningPayload,
    promptTitle = 'SchoolIMS Staff Attendance',
    promptSubtitle = 'Verify your identity with biometrics'
  ): Promise<{
    signature: string;
    canonicalPayload: string;
  }> {
    const registration = await this.getStoredRegistration();
    if (!registration.keyAlias) {
      throw new Error('No biometric key found on this device. Please register first.');
    }

    const canonicalString = buildCanonicalAttendancePayload(payload);

    try {
      const result = await StaffBiometrics.signWithBiometric(
        registration.keyAlias,
        canonicalString,
        promptTitle,
        promptSubtitle
      );
      return {
        signature: result.signature,
        canonicalPayload: canonicalString,
      };
    } catch (error: any) {
      if (error?.message?.includes('KEY_PERMANENTLY_INVALIDATED') ||
          ['KEY_PERMANENTLY_INVALIDATED', 'KEY_NOT_FOUND'].includes(error?.code)) {
        await this.updateRegistrationStatus('invalidated');
      }
      throw error;
    }
  },

  async signDeviceSession(payloadString: string, keyAlias?: string): Promise<string> {
    const registration = keyAlias ? null : await this.getStoredRegistration();
    const alias = keyAlias || registration?.keyAlias;
    if (!alias) {
      throw new Error('No device session key found on this device.');
    }

    const result = await StaffBiometrics.signWithDeviceSessionKey(
      alias,
      payloadString
    );
    return result.signature;
  },

  async deleteKeysForAlias(keyAlias: string): Promise<void> {
    if (Platform.OS === 'web' || !keyAlias) return;
    await StaffBiometrics.deleteKeys(keyAlias);
  },

  async resetLocalRegistration(): Promise<void> {
    if (Platform.OS === 'web') return;
    const registration = await this.getStoredRegistration();
    if (registration.keyAlias) {
      await StaffBiometrics.deleteKeys(registration.keyAlias).catch(() => {});
    }

    await Promise.all([
      SecureStore.deleteItemAsync(REGISTRATION_INFO_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(REGISTRATION_ID_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(STAFF_ID_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(CANONICAL_PERSON_ID_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(KEY_ALIAS_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(DEVICE_PUBLIC_KEY_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(ATTENDANCE_PUBLIC_KEY_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(REGISTRATION_STATUS_KEY).catch(() => {}),
    ]);
  },
};

export default staffBiometricService;
