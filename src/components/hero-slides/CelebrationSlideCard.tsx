import React, { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getMediaUrl } from '../../utils/media';
import type { CelebrationSlideItem, CelebrationPerson } from '../../services/celebrationTypes';

interface CelebrationSlideCardProps {
  slide: CelebrationSlideItem;
  width?: number;
  onOpenGroupModal?: (slide: CelebrationSlideItem) => void;
}

export default function CelebrationSlideCard({
  slide,
  width,
  onOpenGroupModal,
}: CelebrationSlideCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [failedPhotos, setFailedPhotos] = useState<Record<string, boolean>>({});

  // Grouped celebration card ("Today's Birthday Stars")
  if (slide.is_grouped && slide.stars?.length) {
    const stars = slide.stars.slice(0, 4);
    const extraCount = Math.max(0, (slide.count || slide.stars.length) - stars.length);

    return (
      <Pressable
        onPress={() => onOpenGroupModal?.(slide)}
        style={[styles.card, width ? { width } : null]}
        accessibilityRole="button"
        accessibilityLabel="Today's Birthday Stars. Tap to view all"
      >
        <LinearGradient
          colors={['#1E1B4B', '#312E81', '#4F46E5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Festive background accents */}
        <View style={styles.sparkleOne} pointerEvents="none" />
        <View style={styles.sparkleTwo} pointerEvents="none" />

        <View style={styles.groupedContent}>
          <View style={styles.badgeRow}>
            <View style={styles.festiveBadge}>
              <Ionicons name="sparkles" size={11} color="#FDE047" />
              <Text style={styles.festiveBadgeText}>TODAY'S BIRTHDAY STARS 🎂</Text>
            </View>
          </View>

          <Text style={styles.groupedTitle} numberOfLines={1}>
            Celebrating {slide.count || slide.stars.length} Birthdays Today!
          </Text>

          <View style={styles.groupedBottomRow}>
            {/* Avatar Stack */}
            <View style={styles.avatarStack}>
              {stars.map((star, i) => {
                const photoFailed = failedPhotos[star.id] || failedPhotos[String(i)];
                return (
                <View key={star.id || i} style={[styles.stackedAvatar, { zIndex: 10 - i, marginLeft: i === 0 ? 0 : -10 }]}>
                  {star.photo_url && !photoFailed ? (
                    <Image
                      source={{ uri: getMediaUrl(star.photo_url) }}
                      style={styles.avatarImg}
                      resizeMode="cover"
                      onError={() => setFailedPhotos((prev) => ({ ...prev, [star.id || String(i)]: true }))}
                    />
                  ) : (
                    <View style={styles.initialsAvatar}>
                      <Text style={styles.initialsTextSmall}>{star.initials || '★'}</Text>
                    </View>
                  )}
                </View>
                );
              })}
              {extraCount > 0 && (
                <View style={[styles.stackedAvatar, styles.extraBadge, { marginLeft: -10, zIndex: 5 }]}>
                  <Text style={styles.extraCountText}>+{extraCount}</Text>
                </View>
              )}
            </View>

            <View style={styles.viewAllBtn}>
              <Text style={styles.viewAllBtnText}>View All Stars</Text>
              <Ionicons name="arrow-forward" size={12} color="#FDE047" />
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  // Individual celebration card
  const person = slide.person;
  const photoUri = (!imageFailed && person?.photo_url) ? getMediaUrl(person.photo_url) : null;
  const isStudent = person?.type === 'STUDENT';
  const subtitle = isStudent
    ? [person?.class_name ? `Class ${person.class_name}` : null, person?.section_name ? `Sec ${person.section_name}` : null].filter(Boolean).join(' • ')
    : (person?.designation || 'Staff Member');

  return (
    <View style={[styles.card, width ? { width } : null]}>
      <LinearGradient
        colors={['#2E1065', '#581C87', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle festive decorative shapes */}
      <View style={styles.sparkleOne} pointerEvents="none" />
      <View style={styles.sparkleTwo} pointerEvents="none" />

      <View style={styles.cardContent}>
        {/* Avatar with fallback */}
        <View style={styles.avatarShell}>
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={styles.avatarImg}
              resizeMode="cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <LinearGradient
              colors={['#F59E0B', '#EF4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.initialsAvatar}
            >
              <Text style={styles.initialsText}>{person?.initials || '🎂'}</Text>
            </LinearGradient>
          )}
          <View style={styles.cakeIconPill}>
            <Text style={{ fontSize: 10 }}>🎉</Text>
          </View>
        </View>

        {/* Copy */}
        <View style={styles.copyCol}>
          <View style={styles.badgeRow}>
            <View style={styles.festiveBadge}>
              <Ionicons name="sparkles" size={10} color="#FDE047" />
              <Text style={styles.festiveBadgeText}>HAPPY BIRTHDAY 🎂</Text>
            </View>
          </View>

          <Text style={styles.nameText} numberOfLines={1}>
            {person?.name || 'Celebrant'}
          </Text>

          {!!subtitle && (
            <Text style={styles.subtitleText} numberOfLines={1}>
              {subtitle}
            </Text>
          )}

          <Text style={styles.messageText} numberOfLines={2}>
            {slide.message || 'Wishing you happiness, success, and a wonderful year ahead!'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 148,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#1E1B4B',
    justifyContent: 'center',
  },
  sparkleOne: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    right: -40,
    top: -45,
    backgroundColor: 'rgba(253, 224, 71, 0.08)',
  },
  sparkleTwo: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    left: 40,
    bottom: -45,
    backgroundColor: 'rgba(236, 72, 153, 0.09)',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 13,
  },
  avatarShell: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#FDE047',
    padding: 2,
    position: 'relative',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  initialsAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  initialsTextSmall: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  cakeIconPill: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    backgroundColor: '#1E1B4B',
    borderRadius: 10,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  copyCol: {
    flex: 1,
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  festiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(253, 224, 71, 0.16)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  festiveBadgeText: {
    color: '#FDE047',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitleText: {
    color: '#E9D5FF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  messageText: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  groupedContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'space-between',
    height: '100%',
  },
  groupedTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  groupedBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#312E81',
    overflow: 'hidden',
    backgroundColor: '#4338CA',
  },
  extraBadge: {
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(253, 224, 71, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(253, 224, 71, 0.35)',
  },
  viewAllBtnText: {
    color: '#FDE047',
    fontSize: 12,
    fontWeight: '700',
  },
});
