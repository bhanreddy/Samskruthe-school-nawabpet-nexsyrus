import React, { memo, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  BackHandler,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../hooks/useTheme';
import { getMediaUrl } from '../../../utils/media';
import type { EligiblePopup, PopupButton } from '../types';

const CATEGORY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  INFORMATION: 'information-circle',
  WARNING: 'warning',
  IMPORTANT: 'alert-circle',
  EMERGENCY: 'flash',
  FEATURE_UPDATE: 'sparkles',
  APP_UPDATE: 'cloud-download',
  PAYMENT: 'wallet',
  ATTENDANCE: 'calendar',
  EXAM: 'school',
  TRANSPORT: 'bus',
  DOCUMENT: 'document-text',
  MAINTENANCE: 'construct',
  CUSTOM: 'megaphone',
};

type Props = {
  popup: EligiblePopup;
  onButton: (button: PopupButton) => void;
  onDismiss: () => void;
  busy?: boolean;
};

function PopupRendererInner({ popup, onButton, onDismiss, busy }: Props) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const translate = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    fade.setValue(0);
    scale.setValue(0.92);
    translate.setValue(18);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 120, friction: 10, useNativeDriver: true }),
      Animated.timing(translate, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [popup.id, fade, scale, translate]);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (popup.allow_dismiss) onDismiss();
      else if (popup.require_acknowledgement) {
        const ack = popup.buttons.find((b) => b.actionType === 'ACKNOWLEDGE')
          || { id: 'ack', label: 'I Understand', actionType: 'ACKNOWLEDGE' as const };
        onButton(ack);
      }
      return true;
    });
    return () => sub.remove();
  }, [popup, onButton, onDismiss]);

  const critical = popup.priority === 'CRITICAL' || popup.layout_type === 'CRITICAL';
  const accent = critical ? '#DC2626' : popup.priority === 'HIGH' ? '#D97706' : theme.colors.primary;
  const cardWidth = Math.min(width - 32, 440);
  const showImage = Boolean(popup.image_url) && (popup.layout_type === 'RICH' || popup.layout_type === 'UPDATE');
  const buttons = (popup.buttons || []).slice(0, 2);
  const compact = popup.layout_type === 'COMPACT';

  const styles = useMemo(() => createStyles(isDark, theme.colors.card, theme.colors.textStrong, theme.colors.textMuted, accent), [isDark, theme, accent]);

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (popup.allow_dismiss) onDismiss();
      }}
    >
      <Animated.View style={[styles.backdrop, { opacity: fade, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={popup.allow_dismiss ? onDismiss : undefined}
          accessibilityRole="button"
          accessibilityLabel="Dismiss popup backdrop"
        />
        <Animated.View
          style={[
            styles.card,
            {
              width: cardWidth,
              maxHeight: height * 0.82,
              transform: [{ scale }, { translateY: translate }],
            },
          ]}
          accessibilityViewIsModal
          accessibilityLabel={popup.title}
        >
          {popup.allow_dismiss ? (
            <Pressable
              onPress={onDismiss}
              style={styles.close}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={18} color={isDark ? '#CBD5E1' : '#64748B'} />
            </Pressable>
          ) : null}

          {showImage ? (
            <Image
              source={{ uri: getMediaUrl(popup.image_url) }}
              style={[styles.banner, { maxHeight: compact ? 120 : 180 }]}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={[styles.iconWrap, { backgroundColor: `${accent}22` }]}>
              <Ionicons
                name={CATEGORY_ICON[popup.category] || 'megaphone'}
                size={compact ? 22 : 26}
                color={accent}
              />
            </View>
          )}

          <ScrollView
            style={styles.body}
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {popup.heading ? (
              <Text style={styles.kicker}>{popup.heading}</Text>
            ) : null}
            <Text style={[styles.title, compact && { fontSize: 18 }]}>{popup.title}</Text>
            <Text style={styles.message}>{popup.message}</Text>
          </ScrollView>

          <View style={styles.actions}>
            {buttons.map((button) => {
              const primary = button.visualStyle !== 'secondary' && button.visualStyle !== 'ghost';
              const destructive = button.visualStyle === 'destructive';
              return (
                <Pressable
                  key={button.id}
                  disabled={busy}
                  onPress={() => onButton(button)}
                  style={({ pressed }) => [
                    styles.button,
                    primary
                      ? { backgroundColor: destructive ? '#DC2626' : accent }
                      : styles.buttonSecondary,
                    pressed && { opacity: 0.86 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={button.label}
                >
                  <Text style={[styles.buttonText, !primary && { color: accent }]}>
                    {button.label}
                  </Text>
                </Pressable>
              );
            })}
            {!buttons.length && popup.require_acknowledgement ? (
              <Pressable
                disabled={busy}
                onPress={() => onButton({ id: 'ack', label: 'I Understand', actionType: 'ACKNOWLEDGE' })}
                style={[styles.button, { backgroundColor: accent }]}
                accessibilityRole="button"
                accessibilityLabel="I Understand"
              >
                <Text style={styles.buttonText}>I Understand</Text>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export const PopupRenderer = memo(PopupRendererInner);

function createStyles(isDark: boolean, card: string, text: string, muted: string, accent: string) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(2,6,23,0.72)' : 'rgba(15,23,42,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    card: {
      backgroundColor: card,
      borderRadius: 24,
      overflow: 'hidden',
      paddingBottom: 16,
      shadowColor: '#0F172A',
      shadowOpacity: 0.18,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 12,
    },
    close: {
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 2,
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(15,23,42,0.65)' : 'rgba(255,255,255,0.88)',
    },
    banner: {
      width: '100%',
      height: 168,
      backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 22,
      marginLeft: 20,
    },
    body: {
      paddingHorizontal: 20,
      paddingTop: 12,
    },
    kicker: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: accent,
      marginBottom: 6,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: text,
      marginBottom: 8,
    },
    message: {
      fontSize: 15,
      lineHeight: 22,
      color: muted,
    },
    actions: {
      paddingHorizontal: 16,
      paddingTop: 16,
      gap: 10,
    },
    button: {
      minHeight: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    buttonSecondary: {
      backgroundColor: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.05)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148,163,184,0.22)' : 'rgba(15,23,42,0.08)',
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
