import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';
import { useTheme } from '@/src/hooks/useTheme';
import { SCHOOL_ID } from '@/src/constants/school';
import { getHomeRouteForRole } from '@/src/utils/portalRoutes';
import { isStudentRole, isStaffPortalRole } from '@/src/utils/roleHelpers';
import { extractScannedLoginQrText, parseSchoolIMSLoginQr, QrPayloadError } from '@/src/features/student-login-qr/qrPayload';
import { createQrScanGate } from '@/src/features/student-login-qr/qrScanGate';
import { LOGIN_QR_USER_ERRORS, messageForQrLoginFailure } from '@/src/features/student-login-qr/qrLoginErrors';
import { APIError } from '@/src/services/apiClient';
import { useTranslation } from 'react-i18next';

type ScannerState =
  | 'requesting_permission'
  | 'denied'
  | 'scanning'
  | 'validating'
  | 'error';

export default function QrLoginScannerScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isAddMode = mode === 'add';
  const { signInWithQr, addAccountWithQr, switchAccount } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<ScannerState>('requesting_permission');
  const [torch, setTorch] = useState(false);
  const [error, setError] = useState('');
  const [statusText, setStatusText] = useState('');
  const scanGate = useRef(createQrScanGate(1500));
  const validatingRef = useRef(false);

  useEffect(() => {
    if (!permission) setState('requesting_permission');
    else if (!permission.granted) setState('denied');
    else setState((current) => (current === 'error' || current === 'validating' ? current : 'scanning'));
  }, [permission]);

  useEffect(() => () => {
    scanGate.current.reset();
    validatingRef.current = false;
  }, []);

  const resetScanner = useCallback(() => {
    scanGate.current.reset();
    validatingRef.current = false;
    setError('');
    setStatusText('');
    setState('scanning');
  }, []);

  const onBarcodeScanned = useCallback(async (scan: BarcodeScanningResult) => {
    if (state !== 'scanning' || validatingRef.current || !scanGate.current.tryAcquire()) return;
    validatingRef.current = true;
    setState('validating');
    setStatusText(t('qrLogin.verifying', 'Verifying secure login…'));

    try {
      const scannedText = extractScannedLoginQrText(scan);
      const parsed = parseSchoolIMSLoginQr(scannedText);
      if (String(parsed.schoolId) !== String(SCHOOL_ID)) {
        throw new QrPayloadError('QR_SCHOOL_MISMATCH');
      }
      try {
        const network = await NetInfo.fetch();
        if (network.isConnected === false) {
          throw new APIError(LOGIN_QR_USER_ERRORS.NETWORK, 0, undefined, undefined, 'NETWORK_ERROR');
        }
      } catch (networkError) {
        if (networkError instanceof APIError) throw networkError;
      }
      const result = isAddMode
        ? await addAccountWithQr(scannedText)
        : await signInWithQr(scannedText);
      if (result.error || !result.session) {
        const failure = Object.assign(new Error(result.error || LOGIN_QR_USER_ERRORS.UNAVAILABLE), {
          code: (result as { code?: string }).code || 'UNKNOWN_ERROR',
        });
        throw failure;
      }
      let user = result.session.validatedUser;
      if (isAddMode) {
        const switched = await switchAccount(user.userId);
        if (switched.error || !switched.session) {
          throw new Error(switched.error || t('driver_ui.could_not_switch', 'Could not switch'));
        }
        user = switched.session.validatedUser;
      }
      const roleCode = user.role?.code;
      if (isStudentRole(roleCode) && user.has_student_profile === false) return router.replace('/no-profile');
      if (isStaffPortalRole(roleCode) && user.has_staff_profile === false) return router.replace('/no-profile');
      router.replace(getHomeRouteForRole(roleCode));
    } catch (caught) {
      setError(messageForQrLoginFailure(caught));
      setState('error');
      validatingRef.current = false;
      scanGate.current.release();
    }
  }, [addAccountWithQr, isAddMode, router, signInWithQr, state, switchAccount, t]);

  if (!permission || state === 'requesting_permission') {
    return <View style={styles.permissionPage}><ActivityIndicator size="large" color="#8B5CF6" /></View>;
  }

  if (!permission.granted || state === 'denied') {
    const permanentlyDenied = permission.canAskAgain === false;
    return (
      <SafeAreaView style={[styles.permissionPage, isDark && styles.darkPage]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.permissionIcon}><Ionicons name="camera-outline" size={38} color="#7C3AED" /></View>
        <Text style={[styles.permissionTitle, isDark && styles.darkText]}>{t('qrLogin.cameraNeeded', 'Camera access needed')}</Text>
        <Text style={styles.permissionCopy}>
          {permanentlyDenied
            ? t('qrLogin.cameraSettings', 'Enable camera access for SchoolIMS in device settings, then return here.')
            : t('qrLogin.cameraRequired', LOGIN_QR_USER_ERRORS.CAMERA)}
        </Text>
        <Pressable style={styles.primaryButton} onPress={permanentlyDenied ? Linking.openSettings : requestPermission}>
          <Text style={styles.primaryButtonText}>{permanentlyDenied ? t('qrLogin.openSettings', 'Open Settings') : t('qrLogin.allowCamera', 'Allow Camera')}</Text>
        </Pressable>
        <Pressable style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelText}>
            {isAddMode
              ? t('qrLogin.backToAccounts', 'Back to accounts')
              : t('qrLogin.backToLogin', 'Back to login')}
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={state === 'scanning' ? onBarcodeScanned : undefined}
        onMountError={() => { setError('The camera could not start. Check camera access and try again.'); setState('error'); }}
      />
      <View style={styles.scrimTop} />
      <View style={styles.scrimBottom} />
      <SafeAreaView style={styles.overlay}>
        <View style={styles.topBar}>
          <Pressable accessibilityLabel="Close scanner" style={styles.circleButton} onPress={() => router.back()}>
            <Ionicons name="close" size={25} color="#FFFFFF" />
          </Pressable>
          <View style={styles.securePill}><Ionicons name="shield-checkmark" size={14} color="#D8B4FE" /><Text style={styles.secureText}>SECURE QR LOGIN</Text></View>
          <View style={styles.circlePlaceholder} />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>
            {isAddMode
              ? t('qrLogin.addAccountTitle', 'Scan QR to add this account')
              : 'Scan your SchoolIMS Login QR'}
          </Text>
          <Text style={styles.subtitle}>Position the QR code completely inside the frame</Text>
        </View>

        <View style={styles.frame}>
          <View style={[styles.corner, styles.topLeft]} /><View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} /><View style={[styles.corner, styles.bottomRight]} />
          {state === 'validating' ? (
            <View style={styles.processing}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.processingText}>{statusText || t('qrLogin.verifying', 'Verifying secure login…')}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.bottomControls}>
          {state === 'error' ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={22} color="#FCA5A5" />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.tryAgain} onPress={resetScanner}><Text style={styles.tryAgainText}>Scan again</Text></Pressable>
            </View>
          ) : (
            <Text style={styles.privacy}>Keep the QR private. Only scan credentials issued by your school.</Text>
          )}
          <Pressable accessibilityLabel="Toggle flashlight" style={[styles.torchButton, torch && styles.torchActive]} onPress={() => setTorch((value) => !value)}>
            <Ionicons name={torch ? 'flash' : 'flash-outline'} size={21} color="#FFFFFF" />
            <Text style={styles.torchText}>{torch ? 'Flashlight on' : 'Flashlight'}</Text>
          </Pressable>
          {Platform.OS === 'web' ? <Text style={styles.webHint}>Camera scanning requires browser camera permission and HTTPS.</Text> : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080B12' }, overlay: { flex: 1, paddingHorizontal: 22, justifyContent: 'space-between' },
  scrimTop: { position: 'absolute', top: 0, left: 0, right: 0, height: '29%', backgroundColor: 'rgba(5,7,13,.72)' },
  scrimBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', backgroundColor: 'rgba(5,7,13,.78)' },
  topBar: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circleButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(15,23,42,.72)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.2)' },
  circlePlaceholder: { width: 44 }, securePill: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 99, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: 'rgba(88,28,135,.78)', borderWidth: 1, borderColor: 'rgba(216,180,254,.35)' },
  secureText: { color: '#F3E8FF', fontWeight: '800', fontSize: 10, letterSpacing: 1.2 },
  titleBlock: { position: 'absolute', top: '15%', left: 24, right: 24, alignItems: 'center' }, title: { color: '#FFFFFF', fontWeight: '800', fontSize: 23, textAlign: 'center' },
  subtitle: { color: '#CBD5E1', fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: 'center' },
  frame: { position: 'absolute', width: 270, height: 270, alignSelf: 'center', top: '34%', borderRadius: 26, backgroundColor: 'rgba(255,255,255,.04)' },
  corner: { position: 'absolute', width: 48, height: 48, borderColor: '#C4B5FD' }, topLeft: { left: 0, top: 0, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 18 },
  topRight: { right: 0, top: 0, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 18 }, bottomLeft: { left: 0, bottom: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 18 },
  bottomRight: { right: 0, bottom: 0, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 18 },
  processing: { ...StyleSheet.absoluteFillObject, borderRadius: 26, backgroundColor: 'rgba(15,23,42,.78)', alignItems: 'center', justifyContent: 'center', gap: 12 }, processingText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  bottomControls: { paddingBottom: 26, alignItems: 'center', gap: 14 }, privacy: { color: '#CBD5E1', textAlign: 'center', fontSize: 12, lineHeight: 18, maxWidth: 320 },
  torchButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, height: 46, borderRadius: 23, backgroundColor: 'rgba(30,41,59,.86)', borderWidth: 1, borderColor: 'rgba(255,255,255,.22)' }, torchActive: { backgroundColor: '#7C3AED' },
  torchText: { color: '#FFFFFF', fontWeight: '700' }, webHint: { color: '#94A3B8', fontSize: 10, textAlign: 'center' },
  errorCard: { width: '100%', maxWidth: 440, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: 'rgba(127,29,29,.9)', borderWidth: 1, borderColor: 'rgba(252,165,165,.35)' },
  errorText: { flex: 1, color: '#FEF2F2', fontSize: 12, lineHeight: 17 }, tryAgain: { backgroundColor: '#FFFFFF', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9 }, tryAgainText: { color: '#7F1D1D', fontWeight: '800', fontSize: 11 },
  permissionPage: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#F8FAFC' }, darkPage: { backgroundColor: '#080B12' }, permissionIcon: { width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3E8FF', marginBottom: 20 },
  permissionTitle: { color: '#0F172A', fontSize: 24, fontWeight: '800' }, darkText: { color: '#F8FAFC' }, permissionCopy: { color: '#64748B', textAlign: 'center', fontSize: 15, lineHeight: 22, maxWidth: 390, marginTop: 10, marginBottom: 24 },
  primaryButton: { backgroundColor: '#6D28D9', borderRadius: 13, paddingHorizontal: 24, paddingVertical: 14 }, primaryButtonText: { color: '#FFFFFF', fontWeight: '800' }, cancelButton: { padding: 14, marginTop: 4 }, cancelText: { color: '#7C3AED', fontWeight: '700' },
});
