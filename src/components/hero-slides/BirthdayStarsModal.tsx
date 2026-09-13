import React from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { getMediaUrl } from '../../utils/media';
import type { CelebrationPerson } from '../../services/celebrationTypes';

interface BirthdayStarsModalProps {
  visible: boolean;
  stars: CelebrationPerson[];
  onClose: () => void;
}

export default function BirthdayStarsModal({
  visible,
  stars,
  onClose,
}: BirthdayStarsModalProps) {
  const { theme, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: isDark ? '#1E1B4B' : '#FFFFFF' },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconWrap}>
                <Text style={{ fontSize: 18 }}>🎂</Text>
              </View>
              <View>
                <Text
                  style={[
                    styles.title,
                    { color: isDark ? '#FFFFFF' : '#0F172A' },
                  ]}
                >
                  Today's Birthday Stars
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    { color: isDark ? '#A78BFA' : '#64748B' },
                  ]}
                >
                  {stars.length} celebrants today
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9' },
              ]}
              hitSlop={8}
            >
              <Ionicons
                name="close"
                size={18}
                color={isDark ? '#FFFFFF' : '#475569'}
              />
            </TouchableOpacity>
          </View>

          {/* Stars List */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {stars.map((star, idx) => {
              const isStudent = star.type === 'STUDENT';
              const meta = isStudent
                ? [
                    star.class_name ? `Class ${star.class_name}` : null,
                    star.section_name ? `Sec ${star.section_name}` : null,
                  ]
                    .filter(Boolean)
                    .join(' • ')
                : star.designation || 'Staff Member';

              return (
                <View
                  key={star.id || idx}
                  style={[
                    styles.starCard,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.06)'
                        : '#F8FAFC',
                      borderColor: isDark
                        ? 'rgba(255,255,255,0.1)'
                        : '#E2E8F0',
                    },
                  ]}
                >
                  {/* Avatar */}
                  <View style={styles.avatarShell}>
                    {star.photo_url ? (
                      <Image
                        source={{ uri: getMediaUrl(star.photo_url) }}
                        style={styles.avatarImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <LinearGradient
                        colors={['#8B5CF6', '#EC4899']}
                        style={styles.initialsWrap}
                      >
                        <Text style={styles.initialsText}>
                          {star.initials || '★'}
                        </Text>
                      </LinearGradient>
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.starInfo}>
                    <View style={styles.nameRow}>
                      <Text
                        style={[
                          styles.starName,
                          { color: isDark ? '#FFFFFF' : '#0F172A' },
                        ]}
                        numberOfLines={1}
                      >
                        {star.name}
                      </Text>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>
                          {isStudent ? 'STUDENT' : 'STAFF'}
                        </Text>
                      </View>
                    </View>

                    {!!meta && (
                      <Text
                        style={[
                          styles.starMeta,
                          { color: isDark ? '#C4B5FD' : '#64748B' },
                        ]}
                      >
                        {meta}
                      </Text>
                    )}

                    {!!star.message && (
                      <Text
                        style={[
                          styles.starMessage,
                          { color: isDark ? 'rgba(255,255,255,0.8)' : '#334155' },
                        ]}
                      >
                        {star.message}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 32 : 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 16,
  },
  listContent: {
    paddingVertical: 14,
    gap: 10,
  },
  starCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  avatarShell: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  initialsWrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  starInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  starName: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  typeBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: '#D97706',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  starMeta: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  starMessage: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
});
