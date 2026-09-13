import React, { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import * as Haptics from '../../utils/haptics';
import StudentPhoto from '../StudentPhoto';
import QuickAccountPickerSheet from '../QuickAccountPickerSheet';
import { useQuickAccountSwitch } from '../../hooks/useQuickAccountSwitch';
import HeroSlidesCarousel from '../hero-slides/HeroSlidesCarousel';
import SchoolStoriesStrip from '../school-stories/SchoolStoriesStrip';
import type { HeroSlideItem } from '../../services/schoolHeroSlidesService';
import type { CelebrationSlideItem } from '../../services/celebrationTypes';
import type { SchoolStoryAuthor } from '../../services/schoolStoriesService';

const DOUBLE_TAP_MS = 320;
const LONG_PRESS_MS = 450;
const NAVY = ['#15245C', '#1B2F78', '#243A86'] as const;
const RING = '#F5C518';

export interface StudentHeroProps {
  firstName: string;
  classLabel: string;
  inchargeLabel?: string | null;
  photoUrl?: string | null;
  unreadCount: number;
  slides: Array<HeroSlideItem | CelebrationSlideItem>;
  stories: SchoolStoryAuthor[];
  onViewNotifications: () => void;
  onStoryViewed?: (storyId: string) => void;
  onAccountSwitched?: () => void | Promise<void>;
}

export default function StudentHero({
  firstName,
  classLabel,
  inchargeLabel,
  photoUrl,
  unreadCount,
  slides,
  stories,
  onViewNotifications,
  onStoryViewed,
  onAccountSwitched,
}: StudentHeroProps) {
  const { t } = useTranslation();
  const lastTapRef = useRef(0);
  const longPressTriggeredRef = useRef(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const {
    accounts,
    activeId,
    sheetOpen,
    switching,
    switchToNext,
    switchTo,
    openSheet,
    closeSheet,
  } = useQuickAccountSwitch(onAccountSwitched);

  const welcome = t('studentHome.heroWelcome', 'Where Students Meet Their Future');

  const handleAvatarPress = useCallback(() => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      void (async () => {
        setBusyUserId(activeId);
        await switchToNext();
        setBusyUserId(null);
      })();
      return;
    }
    lastTapRef.current = now;
    void Haptics.selectionAsync();
  }, [activeId, switchToNext]);

  const handleLongPress = useCallback(() => {
    longPressTriggeredRef.current = true;
    void openSheet();
  }, [openSheet]);

  const handleSelectAccount = useCallback(async (userId: string) => {
    setBusyUserId(userId);
    await switchTo(userId);
    setBusyUserId(null);
  }, [switchTo]);

  return (
    <Animated.View entering={FadeInDown.duration(420)} style={styles.root}>
      <LinearGradient colors={[...NAVY]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.panel}>
        <View style={styles.orbOne} pointerEvents="none" />
        <View style={styles.orbTwo} pointerEvents="none" />

        <View style={styles.topRow}>
          <View style={styles.copy}>
            <Text style={styles.hello} numberOfLines={1}>
              {t('studentHome.hiName', { name: firstName, defaultValue: `Hi, ${firstName}` })}
            </Text>
            <Text style={styles.classLine} numberOfLines={1}>{classLabel}</Text>
            {!!inchargeLabel && (
              <View style={styles.inchargeChip}>
                <Text style={styles.inchargeText} numberOfLines={1}>{inchargeLabel}</Text>
              </View>
            )}
          </View>
          <Pressable
            onPress={handleAvatarPress}
            onLongPress={handleLongPress}
            delayLongPress={LONG_PRESS_MS}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('driver_ui.account_switch_hint_accessibility', 'Hold to switch accounts; double-tap the photo for the next account')}
            style={({ pressed }) => [styles.photoRing, pressed && styles.pressed]}
          >
            <StudentPhoto
              photoUrl={photoUrl}
              displayName={firstName}
              size={64}
              borderRadius={32}
              fallbackTextStyle={styles.photoFallback}
            />
            {accounts.length > 0 && (
              <View style={styles.switchBadge}>
                <Ionicons name="swap-horizontal" size={10} color="#FFFFFF" />
                {accounts.length > 1 ? (
                  <Text style={styles.switchBadgeText}>{accounts.length}</Text>
                ) : null}
              </View>
            )}
          </Pressable>
        </View>

        <Text style={styles.welcome} numberOfLines={1}>{welcome}</Text>

        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onViewNotifications();
          }}
          style={({ pressed }) => [styles.urgentBar, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t('studentHome.urgentNotifications', { count: unreadCount })}
        >
          <View style={styles.bellWrap}>
            <Ionicons name="notifications" size={16} color="#1E3A8A" />
          </View>
          <Text style={styles.urgentText} numberOfLines={1}>
            {unreadCount > 0
              ? t('studentHome.urgentCount', { count: unreadCount, defaultValue: `${unreadCount} Urgent Notifications` })
              : t('studentHome.noUrgent', 'No urgent notifications')}
          </Text>
          <View style={styles.viewBtn}>
            <Text style={styles.viewBtnText}>{t('studentHome.view', 'View')}</Text>
          </View>
        </Pressable>

        <HeroSlidesCarousel slides={slides} />
        <SchoolStoriesStrip
          stories={stories}
          tone="onDark"
          style={{ paddingTop: 12 }}
          onStoryViewed={onStoryViewed}
        />
      </LinearGradient>

      <QuickAccountPickerSheet
        visible={sheetOpen}
        accounts={accounts}
        activeId={activeId}
        switching={switching}
        busyUserId={busyUserId}
        onClose={closeSheet}
        onSelect={handleSelectAccount}
      />

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%' },
  panel: {
    borderRadius: 0,
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 18,
    overflow: 'hidden',
  },
  orbOne: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(125,211,252,0.10)',
    right: -50,
    top: -70,
  },
  orbTwo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(251,191,36,0.10)',
    left: -40,
    bottom: 40,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  copy: { flex: 1, minWidth: 0 },
  hello: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  classLine: { color: 'rgba(255,255,255,0.78)', fontSize: 14, fontWeight: '600', marginTop: 4 },
  inchargeChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  inchargeText: { color: '#1E3A8A', fontSize: 11, fontWeight: '800' },
  photoRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: RING,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  switchBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    minWidth: 22,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: '#1D4ED8',
    borderWidth: 2,
    borderColor: '#15245C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  switchBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  photoFallback: { color: '#FFFFFF', fontSize: 22 },
  welcome: {
    color: '#7DD3FC',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 12,
  },
  urgentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 6,
    marginBottom: 14,
    gap: 8,
  },
  bellWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentText: { flex: 1, color: '#0F172A', fontSize: 13, fontWeight: '700' },
  viewBtn: {
    backgroundColor: '#FACC15',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  viewBtnText: { color: '#1E3A8A', fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
});
