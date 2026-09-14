import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/src/utils/haptics';
import { useTheme } from '@/src/hooks/useTheme';
import { clayTokens } from '@/src/styles/clayTokens';
import { formatDistanceToNow } from 'date-fns';
import { ContentItem, contentService } from '@/src/services/contentService';

interface NewsCardProps {
  news?: ContentItem;
  item?: ContentItem;
  variant?: 'hero' | 'standard';
  onPress?: () => void;
  onBookmarkToggled?: (bookmarked: boolean) => void;
  style?: any;
}

export default function NewsCard({
  news,
  item,
  variant = 'standard',
  onPress,
  onBookmarkToggled,
  style,
}: NewsCardProps) {
  const article = news || item;
  if (!article) return null;

  const { isDark } = useTheme();
  const [isBookmarked, setIsBookmarked] = useState(Boolean(article.is_bookmarked));

  const headline = article.headline || article.title || '';
  const summary = article.summary || '';
  const category = article.news_category || article.category || 'Campus';
  const sourceName = article.source_name || 'SchoolIMS News';
  const readingTime = article.reading_time || 2;
  const coverImage = article.cover_image_url;

  const handleBookmark = async (e: any) => {
    e?.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newBookmarked = !isBookmarked;
    setIsBookmarked(newBookmarked);
    if (onBookmarkToggled) onBookmarkToggled(newBookmarked);
    try {
      await contentService.toggleBookmark(article.id);
    } catch {
      // ignore
    }
  };

  const cardBg = isDark ? clayTokens.colors.card.dark : clayTokens.colors.card.light;
  const textCol = isDark ? '#F9FAFB' : clayTokens.colors.text.primary;
  const subCol = isDark ? '#9CA3AF' : clayTokens.colors.text.muted;
  const borderCol = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(76,90,120,0.10)';

  let timeAgo = '';
  try {
    if (article.published_at) {
      timeAgo = formatDistanceToNow(new Date(article.published_at), { addSuffix: true });
    }
  } catch {
    timeAgo = 'Today';
  }

  if (variant === 'hero') {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.88}
        style={[styles.heroCard, { backgroundColor: cardBg, borderColor: borderCol }, style]}
      >
        {coverImage ? (
          <View style={styles.heroImageContainer}>
            <Image source={{ uri: coverImage }} style={styles.heroImage} resizeMode="cover" />
            <View style={styles.heroImageOverlay} />
            <View style={styles.heroTopRow}>
              <View style={styles.heroCatBadge}>
                <Text style={styles.heroCatText}>{category.toUpperCase()}</Text>
              </View>
              <TouchableOpacity onPress={handleBookmark} style={styles.heroBookmarkBtn}>
                <Ionicons
                  name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={isBookmarked ? '#F59E0B' : '#FFFFFF'}
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.heroContent}>
          {!coverImage ? (
            <View style={styles.heroNoImageTop}>
              <View style={styles.heroCatBadgeLight}>
                <Text style={styles.heroCatTextLight}>{category.toUpperCase()}</Text>
              </View>
              <TouchableOpacity onPress={handleBookmark} style={styles.bookmarkBtnLight}>
                <Ionicons
                  name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={isBookmarked ? '#F59E0B' : subCol}
                />
              </TouchableOpacity>
            </View>
          ) : null}

          <Text style={[styles.heroHeadline, { color: textCol }]} numberOfLines={2}>
            {headline}
          </Text>

          {summary ? (
            <Text style={[styles.heroSummary, { color: subCol }]} numberOfLines={2}>
              {summary}
            </Text>
          ) : null}

          <View style={styles.heroMetaRow}>
            <View style={styles.sourcePill}>
              <Ionicons name="newspaper-outline" size={12} color="#3B82F6" style={{ marginRight: 4 }} />
              <Text style={styles.sourceText} numberOfLines={1}>{sourceName}</Text>
            </View>
            <Text style={[styles.dotSep, { color: subCol }]}>•</Text>
            <Text style={[styles.metaText, { color: subCol }]}>{readingTime} min read</Text>
            {timeAgo ? (
              <>
                <Text style={[styles.dotSep, { color: subCol }]}>•</Text>
                <Text style={[styles.metaText, { color: subCol }]}>{timeAgo}</Text>
              </>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Standard List Variant
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.standardCard, { backgroundColor: cardBg, borderColor: borderCol }, style]}
    >
      <View style={styles.standardBody}>
        <View style={styles.standardMetaRow}>
          <Text style={styles.catLabel}>{category.toUpperCase()}</Text>
          <Text style={[styles.dotSep, { color: subCol }]}>•</Text>
          <Text style={[styles.sourceLabel, { color: subCol }]} numberOfLines={1}>{sourceName}</Text>
        </View>

        <Text style={[styles.standardHeadline, { color: textCol }]} numberOfLines={2}>
          {headline}
        </Text>

        {summary ? (
          <Text style={[styles.standardSummary, { color: subCol }]} numberOfLines={2}>
            {summary}
          </Text>
        ) : null}

        <View style={styles.standardBottomRow}>
          <Text style={[styles.metaText, { color: subCol }]}>{readingTime}m read</Text>
          {timeAgo ? (
            <>
              <Text style={[styles.dotSep, { color: subCol }]}>•</Text>
              <Text style={[styles.metaText, { color: subCol }]}>{timeAgo}</Text>
            </>
          ) : null}
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={handleBookmark} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={isBookmarked ? '#F59E0B' : subCol}
            />
          </TouchableOpacity>
        </View>
      </View>

      {coverImage ? (
        <Image source={{ uri: coverImage }} style={styles.thumbnailImage} resizeMode="cover" />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: clayTokens.radii.card,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(76,90,120,0.10)',
  },
  heroImageContainer: {
    height: 180,
    width: '100%',
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  heroTopRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroCatBadge: {
    backgroundColor: 'rgba(15,23,42,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroCatText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroBookmarkBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    padding: 16,
  },
  heroNoImageTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heroCatBadgeLight: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroCatTextLight: {
    color: clayTokens.colors.daily.newsAccent,
    fontSize: 11,
    fontWeight: '700',
  },
  bookmarkBtnLight: {
    padding: 4,
  },
  heroHeadline: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 8,
  },
  heroSummary: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59,130,246,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    maxWidth: 160,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '600',
    color: clayTokens.colors.daily.newsAccent,
  },
  dotSep: {
    marginHorizontal: 6,
    fontSize: 12,
  },
  metaText: {
    fontSize: 12,
  },
  standardCard: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  standardBody: {
    flex: 1,
    marginRight: 12,
  },
  standardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  catLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: clayTokens.colors.daily.newsAccent,
  },
  sourceLabel: {
    fontSize: 11,
    maxWidth: 120,
  },
  standardHeadline: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 4,
  },
  standardSummary: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  standardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
});

export { NewsCard };
