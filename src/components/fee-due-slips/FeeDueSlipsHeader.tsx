import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export type ActiveTab = 'generate' | 'templates' | 'history';

interface FeeDueSlipsHeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  templatesCount?: number;
  historyCount?: number;
  isDark?: boolean;
}

export const FeeDueSlipsHeader: React.FC<FeeDueSlipsHeaderProps> = ({
  activeTab,
  onTabChange,
  templatesCount = 1,
  historyCount = 0,
  isDark = false,
}) => {
  const router = useRouter();

  const textColor = isDark ? '#F9FAFB' : '#111827';
  const subtextColor = isDark ? '#9CA3AF' : '#4B5563';
  const tabBg = isDark ? '#1F2937' : '#F1F5F9';
  const activeTabBg = '#3B82F6';
  const activeTabText = '#FFFFFF';
  const inactiveTabText = isDark ? '#9CA3AF' : '#4B5563';

  return (
    <View style={[styles.container, { borderBottomColor: isDark ? '#374151' : '#E2E8F0' }]}>
      <View style={styles.topRow}>
        <View style={styles.leftGroup}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: isDark ? '#374151' : '#E2E8F0' }]}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={20} color={textColor} />
          </TouchableOpacity>
          <View>
            <View style={styles.breadcrumbRow}>
              <Text style={[styles.breadcrumbText, { color: subtextColor }]}>Accounts</Text>
              <Ionicons name="chevron-forward" size={12} color={subtextColor} style={{ marginHorizontal: 4 }} />
              <Text style={[styles.breadcrumbText, { color: subtextColor }]}>Fee Management</Text>
              <Ionicons name="chevron-forward" size={12} color={subtextColor} style={{ marginHorizontal: 4 }} />
              <Text style={[styles.breadcrumbCurrent, { color: textColor }]}>Fee Due Slips</Text>
            </View>
            <Text style={[styles.title, { color: textColor }]}>Fee Due Slips</Text>
            <Text style={[styles.subtitle, { color: subtextColor }]}>
              Generate personalized printable notices, reminders & tearable slips
            </Text>
          </View>
        </View>

        {/* Tab Controls */}
        <View style={[styles.tabContainer, { backgroundColor: tabBg }]}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'generate' && { backgroundColor: activeTabBg }]}
            onPress={() => onTabChange('generate')}
          >
            <Ionicons
              name="document-text-outline"
              size={16}
              color={activeTab === 'generate' ? activeTabText : inactiveTabText}
            />
            <Text style={[styles.tabLabel, { color: activeTab === 'generate' ? activeTabText : inactiveTabText }]}>
              Generate Slips
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'templates' && { backgroundColor: activeTabBg }]}
            onPress={() => onTabChange('templates')}
          >
            <Ionicons
              name="color-palette-outline"
              size={16}
              color={activeTab === 'templates' ? activeTabText : inactiveTabText}
            />
            <Text style={[styles.tabLabel, { color: activeTab === 'templates' ? activeTabText : inactiveTabText }]}>
              Templates
            </Text>
            {templatesCount > 0 && (
              <View style={[styles.badge, activeTab === 'templates' && styles.badgeActive]}>
                <Text style={[styles.badgeText, activeTab === 'templates' && { color: '#3B82F6' }]}>
                  {templatesCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'history' && { backgroundColor: activeTabBg }]}
            onPress={() => onTabChange('history')}
          >
            <Ionicons
              name="time-outline"
              size={16}
              color={activeTab === 'history' ? activeTabText : inactiveTabText}
            />
            <Text style={[styles.tabLabel, { color: activeTab === 'history' ? activeTabText : inactiveTabText }]}>
              History
            </Text>
            {historyCount > 0 && (
              <View style={[styles.badge, activeTab === 'history' && styles.badgeActive]}>
                <Text style={[styles.badgeText, activeTab === 'history' && { color: '#3B82F6' }]}>
                  {historyCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  breadcrumbText: {
    fontSize: 12,
    fontWeight: '500',
  },
  breadcrumbCurrent: {
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    alignItems: 'center',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 2,
  },
  badgeActive: {
    backgroundColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
});
