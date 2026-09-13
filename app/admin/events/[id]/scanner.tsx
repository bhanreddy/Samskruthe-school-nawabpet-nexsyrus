import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from '@/src/utils/haptics';
import { eventService } from '@/src/services/eventService';
import { eventOfflineQueue } from '@/src/services/eventOfflineQueue';

export default function EventScannerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  const [torch, setTorch] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);
  const isLockedRef = useRef(false);

  const handleScan = useCallback(async (code: string) => {
    if (isLockedRef.current || processing || !code || !id) return;
    isLockedRef.current = true;
    setProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const cleanToken = code.trim();
      const res = await eventService.validatePassToken(cleanToken);
      const validation = res?.data;

      if (!validation?.isValid) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLastResult({
          success: false,
          reason: validation?.reason,
          message: validation?.message || 'Pass invalid or denied',
          pass: validation?.pass,
        });
        return;
      }

      // Check-in immediately
      const checkin = await eventService.checkInPass({
        token: cleanToken,
        eventId: id,
        scanType: 'GATE_ENTRY',
        verificationMethod: 'QR_SCAN',
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLastResult({
        success: true,
        message: 'Verified & Admitted',
        pass: checkin.data?.pass || validation?.pass,
      });
    } catch (err: any) {
      // Offline fallback: enqueue scan for automatic synchronization
      await eventOfflineQueue.enqueue('GATE_CHECKIN', id, {
        token: code.trim(),
        scanType: 'GATE_ENTRY',
        verificationMethod: 'QR_SCAN',
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setLastResult({
        success: true,
        isOfflineQueued: true,
        message: 'Saved to Offline Queue (Admitted)',
        pass: { attendee_name: 'Queued Attendee' },
      });
    } finally {
      setProcessing(false);
      setTimeout(() => {
        isLockedRef.current = false;
      }, 2500);
    }
  }, [id, processing]);

  const onBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (data && !processing && !isLockedRef.current) {
      handleScan(data);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Field QR Scanner</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setTorch(!torch)}>
          <Ionicons name={torch ? 'flash' : 'flash-off'} size={20} color={torch ? '#F59E0B' : '#FFF'} />
        </TouchableOpacity>
      </View>

      {/* Camera Viewport */}
      <View style={styles.cameraWrap}>
        {Platform.OS !== 'web' && permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onBarcodeScanned}
          />
        ) : (
          <View style={styles.permissionBox}>
            <Ionicons name="camera-outline" size={48} color="#64748B" />
            <Text style={styles.permissionText}>
              {Platform.OS === 'web' ? 'Camera scanning active' : 'Camera permission required'}
            </Text>
            {Platform.OS !== 'web' && !permission?.granted && (
              <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                <Text style={styles.permBtnText}>Grant Access</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Viewfinder Overlay */}
        <View style={styles.reticleOuter}>
          <View style={styles.reticle} />
        </View>

        {/* Scan Status Modal / Banner */}
        {lastResult && (
          <View style={[styles.resultBanner, { backgroundColor: lastResult.success ? '#064E3B' : '#7F1D1D' }]}>
            <View style={styles.resultRow}>
              <Ionicons
                name={lastResult.success ? 'checkmark-circle' : 'alert-circle'}
                size={28}
                color={lastResult.success ? '#34D399' : '#F87171'}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.resultTitle}>
                  {lastResult.success ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
                </Text>
                <Text style={styles.resultAttendee}>
                  {lastResult.pass?.attendee_name || lastResult.pass?.student_name || 'Attendee'}
                </Text>
                <Text style={styles.resultSub}>{lastResult.message}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Manual Input Strip */}
      <View style={styles.bottomStrip}>
        <View style={styles.manualRow}>
          <TextInput
            placeholder="Enter pass code (e.g. EV-AB2-9X4)"
            placeholderTextColor="#64748B"
            value={manualCode}
            onChangeText={setManualCode}
            autoCapitalize="characters"
            style={styles.manualInput}
          />
          <TouchableOpacity
            style={styles.manualSubmitBtn}
            onPress={() => {
              if (manualCode.trim()) handleScan(manualCode.trim());
            }}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.manualSubmitText}>Check In</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#090D16' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  cameraWrap: { flex: 1, position: 'relative', overflow: 'hidden' },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#111827',
  },
  permissionText: { color: '#9CA3AF', fontSize: 14, marginTop: 10, textAlign: 'center' },
  permBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  permBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  reticleOuter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  reticle: {
    width: 250,
    height: 250,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99,102,241,0.05)',
  },
  resultBanner: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultTitle: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  resultAttendee: { color: '#FFF', fontSize: 16, fontWeight: '800', marginTop: 2 },
  resultSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  bottomStrip: {
    padding: 16,
    backgroundColor: '#111827',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  manualRow: { flexDirection: 'row', gap: 10 },
  manualInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#1F2937',
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#FFF',
    fontSize: 13,
  },
  manualSubmitBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualSubmitText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
});
