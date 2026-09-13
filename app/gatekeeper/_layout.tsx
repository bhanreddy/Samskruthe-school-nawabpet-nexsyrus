import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/hooks/useAuth';
import { useTheme } from '@/src/hooks/useTheme';
import { visitorService, type SchoolGate } from '@/src/services/visitorService';
import { visitorOfflineQueue } from '@/src/services/visitorOfflineQueue';
import { useRequireRole } from '@/src/hooks/useRequireRole';
import NetInfo from '@react-native-community/netinfo';

export default function GatekeeperLayout() {
  useRequireRole('gate_keeper', 'gatekeeper', 'admin', 'principal');
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isDark } = useTheme();

  const [currentGate, setCurrentGate] = useState<SchoolGate | null>(null);
  const [offlinePendingCount, setOfflinePendingCount] = useState(0);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Load gate info
    visitorService
      .getMyGate()
      .then((res) => {
        if (res?.currentGate) {
          setCurrentGate(res.currentGate);
        }
      })
      .catch(() => {});

    // Listen to offline queue changes
    const updateCount = async () => {
      const len = await visitorOfflineQueue.getQueueLength();
      setOfflinePendingCount(len);
    };

    updateCount();
    const unsub = visitorOfflineQueue.addListener(() => {
      updateCount();
    });
    visitorService.getOfflineCache().then((passes) => visitorOfflineQueue.cacheApprovedPasses(passes)).catch(() => {});

    const netUnsub = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false;
      setIsOffline(offline);
      if (!offline) visitorOfflineQueue.syncOfflineEvents();
    });

    return () => {
      unsub();
      netUnsub();
    };
  }, []);

  const handleLogout = () => {
    Alert.alert('Gatekeeper Sign Out', 'Are you sure you want to exit the gate terminal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/login' as any);
        },
      },
    ]);
  };

  const hudBg = isDark ? '#080C14' : '#0F172A';
  const hudBorder = isDark ? '#1E293B' : '#1E293B';

  return (
    <View style={styles.root}>
      {/* Universal Security HUD Topbar */}
      <SafeAreaView edges={['top']} style={[styles.hudContainer, { backgroundColor: hudBg, borderBottomColor: hudBorder }]}>
        <View style={styles.hudRow}>
          {/* Gate Badge */}
          <View style={styles.gateBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.gateBadgeText} numberOfLines={1}>
              {currentGate ? `${currentGate.name.toUpperCase()}` : 'GATE 1 - MAIN'}
            </Text>
          </View>

          {/* Right Status Block */}
          <View style={styles.rightHud}>
            {isOffline || offlinePendingCount > 0 ? (
              <TouchableOpacity
                style={styles.offlineChip}
                onPress={() => visitorOfflineQueue.syncOfflineEvents()}
              >
                <Ionicons name="cloud-offline" size={13} color="#F59E0B" />
                <Text style={styles.offlineChipText}>{isOffline ? 'OFFLINE MODE' : `${offlinePendingCount} Queued`}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.onlineChip}>
                <Ionicons name="cloud-done" size={13} color="#10B981" />
                <Text style={styles.onlineChipText}>ONLINE</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.profileBtn}
              onPress={handleLogout}
              accessibilityLabel="Sign out"
            >
              <Ionicons name="log-out-outline" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Screen Content */}
      <View style={styles.stackWrapper}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: isDark ? '#0B0F17' : '#F4F6F9' },
          }}
        >
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="scanner" />
          <Stack.Screen name="verify" />
          <Stack.Screen name="walkin" />
          <Stack.Screen name="inside" />
          <Stack.Screen name="pickup" />
          <Stack.Screen name="deliveries" />
          <Stack.Screen name="materials" />
          <Stack.Screen name="emergency" />
          <Stack.Screen name="incidents" />
          <Stack.Screen name="expected" />
          <Stack.Screen name="search" />
          <Stack.Screen name="vehicles" />
          <Stack.Screen name="contractors" />
        </Stack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hudContainer: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  hudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
  },
  gateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    maxWidth: '55%',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  gateBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rightHud: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  onlineChipText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  offlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  offlineChipText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
  },
  profileBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  stackWrapper: {
    flex: 1,
  },
});
