import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/hooks/useTheme';
import PopupHistoryScreen from '../src/features/popups/screens/PopupHistoryScreen';

export default function UpdatesRoute() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 12 }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.textStrong} />
        </Pressable>
        <View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.textStrong }}>Updates</Text>
          <Text style={{ fontSize: 13, color: theme.colors.textMuted }}>Important messages you may have missed</Text>
        </View>
      </View>
      <PopupHistoryScreen embedded />
    </View>
  );
}
