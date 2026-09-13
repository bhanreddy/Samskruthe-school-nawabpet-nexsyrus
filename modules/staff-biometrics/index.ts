import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

export interface BiometricCapability {
  isAvailable: boolean;
  hasStrongBiometrics: boolean;
  enrolled: boolean;
  biometryType?: 'FACE_ID' | 'TOUCH_ID' | 'NONE';
  reason: string | null;
}

export interface GeneratedKeyResult {
  success: boolean;
  publicKey: string;
  keyAlias: string;
}

export interface BiometricSignatureResult {
  success: boolean;
  signature: string;
}

interface NativeStaffBiometricsInterface {
  checkBiometricCapability(): Promise<BiometricCapability>;
  generateAttendanceKey(alias: string): Promise<GeneratedKeyResult>;
  generateDeviceSessionKey(alias: string): Promise<GeneratedKeyResult>;
  signWithBiometric(
    alias: string,
    canonicalPayload: string,
    promptTitle: string,
    promptSubtitle: string
  ): Promise<BiometricSignatureResult>;
  signWithDeviceSessionKey(
    alias: string,
    payload: string
  ): Promise<BiometricSignatureResult>;
  deleteKeys(alias: string): Promise<boolean>;
}

let nativeModule: NativeStaffBiometricsInterface | null = null;

if (Platform.OS === 'android' || Platform.OS === 'ios') {
  try {
    nativeModule = requireNativeModule<NativeStaffBiometricsInterface>('StaffBiometricsModule');
  } catch (e) {
    console.warn('[StaffBiometricsModule] Failed to load native module:', e);
  }
}

export const StaffBiometrics = {
  async checkBiometricCapability(): Promise<BiometricCapability> {
    if (Platform.OS === 'web') {
      return {
        isAvailable: false,
        hasStrongBiometrics: false,
        enrolled: false,
        reason: 'UNSUPPORTED_PLATFORM',
      };
    }
    if (!nativeModule) {
      return {
        isAvailable: false,
        hasStrongBiometrics: false,
        enrolled: false,
        reason: 'MODULE_NOT_LOADED',
      };
    }
    return await nativeModule.checkBiometricCapability();
  },

  async generateAttendanceKey(alias: string): Promise<GeneratedKeyResult> {
    if (!nativeModule) {
      throw new Error('StaffBiometricsModule is not available on this platform');
    }
    return await nativeModule.generateAttendanceKey(alias);
  },

  async generateDeviceSessionKey(alias: string): Promise<GeneratedKeyResult> {
    if (!nativeModule) {
      throw new Error('StaffBiometricsModule is not available on this platform');
    }
    return await nativeModule.generateDeviceSessionKey(alias);
  },

  async signWithBiometric(
    alias: string,
    canonicalPayload: string,
    promptTitle = 'Staff Attendance Verification',
    promptSubtitle = 'Authenticate to sign attendance event'
  ): Promise<BiometricSignatureResult> {
    if (!nativeModule) {
      throw new Error('StaffBiometricsModule is not available on this platform');
    }
    return await nativeModule.signWithBiometric(
      alias,
      canonicalPayload,
      promptTitle,
      promptSubtitle
    );
  },

  async signWithDeviceSessionKey(
    alias: string,
    payload: string
  ): Promise<BiometricSignatureResult> {
    if (!nativeModule) {
      throw new Error('StaffBiometricsModule is not available on this platform');
    }
    return await nativeModule.signWithDeviceSessionKey(alias, payload);
  },

  async deleteKeys(alias: string): Promise<boolean> {
    if (!nativeModule) return true;
    return await nativeModule.deleteKeys(alias);
  },
};

export default StaffBiometrics;
