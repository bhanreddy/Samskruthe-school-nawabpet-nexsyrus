import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { contentService, DailyFeedResponse } from '../../services/contentService';
import * as Haptics from '../../utils/haptics';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { clayTokens } from '../../styles/clayTokens';
import { useTranslation } from 'react-i18next';

export const DailySparkWidget: React.FC = () => {
  const router = useRouter();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [feed, setFeed] = useState<DailyFeedResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    const userId = user?.userId || user?.id || undefined;
    contentService
      .getDailyFeed({ userId, onFreshData: (data) => { if (mounted) setFeed(data); } })
      .then((data) => {
        if (mounted && data) setFeed(data);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [user?.userId, user?.id]);

  const thought = feed?.thought;
  const leadNews = feed?.featured?.[0] || feed?.featuredNews?.[0] || feed?.news?.[0];

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/Screen/schoolDaily' as any);
  };

  const quote = thought?.quote || thought?.title || '';
  const author = thought?.author || (thought as any)?.thought_author;

  return (
    <Animated.View entering={FadeInDown.delay(120).duration(280)} style={styles.container}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={t('school_daily.title')}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.pressed,
          { backgroundColor: isDark ? clayTokens.colors.card.dark : clayTokens.colors.daily.thoughtBg },
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 0.9 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.headerRow}>
          <View style={styles.badge}>
            <Ionicons name="sunny-outline" size={13} color={clayTokens.colors.daily.thoughtAccent} />
            <Text style={styles.badgeText}>{t('school_daily.title').toUpperCase()}</Text>
          </View>
          <View style={styles.viewAction}>
            <Text style={styles.viewActionText}>{t('school_daily.open_edition')}</Text>
            <Ionicons name="chevron-forward" size={13} color={clayTokens.colors.daily.thoughtAccent} />
          </View>
        </View>

        {thought ? (
          <View style={styles.contentBody}>
            <Text style={[styles.quoteText, { color: isDark ? '#F8FAFC' : clayTokens.colors.text.primary }]} numberOfLines={2}>
              “{quote}”
            </Text>
            <Text style={styles.authorText}>— {author || t('school_daily.todays_thought')}</Text>
          </View>
        ) : leadNews ? (
          <View style={styles.contentBody}>
            <Text style={[styles.headlineText, { color: isDark ? '#F8FAFC' : clayTokens.colors.text.primary }]} numberOfLines={2}>
              {leadNews.headline || leadNews.title}
            </Text>
            <Text style={styles.metaText}>
              {leadNews.news_category || leadNews.category || t('school_daily.todays_news')} • {leadNews.reading_time || 2} min read
            </Text>
          </View>
        ) : (
          <View style={styles.contentBody}>
            <Text style={[styles.headlineText, { color: isDark ? '#F8FAFC' : clayTokens.colors.text.primary }]} numberOfLines={2}>
              {t('school_daily.empty_edition')}
            </Text>
            <Text style={styles.metaText}>{t('school_daily.open_edition')}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    width: '100%',
  },
  card: {
    borderRadius: clayTokens.radii.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139,104,64,0.16)',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(76,90,120,0.10)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#6B7A99',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
      web: { boxShadow: '0 10px 22px rgba(107,122,153,0.14)' },
    }),
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.97 }],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: clayTokens.colors.daily.thoughtSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: clayTokens.radii.chip,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: clayTokens.colors.daily.thoughtAccent,
    letterSpacing: 0.6,
  },
  viewAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: clayTokens.colors.daily.thoughtAccent,
  },
  contentBody: {
    marginTop: 2,
  },
  quoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
    fontWeight: '500',
  },
  headlineText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  authorText: {
    fontSize: 12,
    color: clayTokens.colors.daily.thoughtAccent,
    fontWeight: '600',
    marginTop: 4,
  },
  metaText: {
    fontSize: 11,
    color: clayTokens.colors.text.muted,
    marginTop: 4,
  },
});
