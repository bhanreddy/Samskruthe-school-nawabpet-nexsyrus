import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import * as Haptics from '../utils/haptics';

type Props = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: React.ReactNode;
};

export default function StudentSubpageHeader({ title, subtitle, onBack, right }: Props) {
  const { theme, isDark } = useTheme();

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onBack();
        }}
        style={[
          styles.back,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={22} color={theme.colors.textStrong} />
      </Pressable>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: theme.colors.textStrong }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.sub, { color: theme.colors.textMuted }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? <View style={styles.rightSlot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 12,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  copy: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  sub: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 17,
  },
  rightSlot: { width: 40, height: 40 },
});
