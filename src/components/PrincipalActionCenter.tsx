import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  GovernanceService,
  ActionCenterItem,
  ActionCenterResponse,
} from '../services/governanceService';
import { useTheme } from '../hooks/useTheme';
import * as Haptics from '../utils/haptics';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type HealthStatus = 'HEALTHY' | 'ATTENTION' | 'CRITICAL' | 'UNKNOWN' | string;

const isAndroid = Platform.OS === 'android';
const isWeb = Platform.OS === 'web';

const enter = (delay = 0) =>
  isAndroid ? undefined : FadeInDown.delay(delay).springify().damping(16);

const SUBSYSTEM_ROUTES: Record<string, string> = {
  transport: '/admin/transport',
  attendance: '/admin/attendance-risk',
  academics: '/admin/syllabus',
  finance: '/admin/fee-reminders',
  governance: '/admin/approvals',
};

const SUBSYSTEM_META: Record<string, { icon: IconName; label: string }> = {
  transport: { icon: 'bus-outline', label: 'Transport' },
  attendance: { icon: 'people-outline', label: 'Attendance' },
  academics: { icon: 'book-outline', label: 'Academics' },
  finance: { icon: 'wallet-outline', label: 'Finance' },
  governance: { icon: 'shield-checkmark-outline', label: 'Governance' },
};

type CategoryTheme = {
  icon: IconName;
  accent: string;
  accentDark: string;
  wash: string;
  washDark: string;
  iconWash: string;
  iconWashDark: string;
  stripe: string;
  unit: string;
};

const CATEGORY_THEME: Record<string, CategoryTheme> = {
  attendance: {
    icon: 'calendar-outline',
    accent: '#C2410C',
    accentDark: '#FDBA74',
    wash: '#FFF7ED',
    washDark: 'rgba(234,88,12,0.12)',
    iconWash: '#FFEDD5',
    iconWashDark: 'rgba(251,146,60,0.22)',
    stripe: '#F97316',
    unit: 'students',
  },
  finance: {
    icon: 'cash-outline',
    accent: '#047857',
    accentDark: '#6EE7B7',
    wash: '#ECFDF5',
    washDark: 'rgba(16,185,129,0.12)',
    iconWash: '#D1FAE5',
    iconWashDark: 'rgba(52,211,153,0.20)',
    stripe: '#10B981',
    unit: 'students',
  },
  governance: {
    icon: 'documents-outline',
    accent: '#4338CA',
    accentDark: '#A5B4FC',
    wash: '#EEF2FF',
    washDark: 'rgba(79,70,229,0.14)',
    iconWash: '#E0E7FF',
    iconWashDark: 'rgba(129,140,248,0.22)',
    stripe: '#6366F1',
    unit: 'students',
  },
  transport: {
    icon: 'bus-outline',
    accent: '#0369A1',
    accentDark: '#7DD3FC',
    wash: '#F0F9FF',
    washDark: 'rgba(14,165,233,0.12)',
    iconWash: '#E0F2FE',
    iconWashDark: 'rgba(56,189,248,0.20)',
    stripe: '#0EA5E9',
    unit: 'alerts',
  },
  academics: {
    icon: 'library-outline',
    accent: '#6D28D9',
    accentDark: '#C4B5FD',
    wash: '#F5F3FF',
    washDark: 'rgba(124,58,237,0.14)',
    iconWash: '#EDE9FE',
    iconWashDark: 'rgba(167,139,250,0.22)',
    stripe: '#8B5CF6',
    unit: 'subjects',
  },
  staff: {
    icon: 'person-outline',
    accent: '#0F766E',
    accentDark: '#5EEAD4',
    wash: '#F0FDFA',
    washDark: 'rgba(13,148,136,0.12)',
    iconWash: '#CCFBF1',
    iconWashDark: 'rgba(45,212,191,0.20)',
    stripe: '#14B8A6',
    unit: 'requests',
  },
  support: {
    icon: 'headset-outline',
    accent: '#BE123C',
    accentDark: '#FDA4AF',
    wash: '#FFF1F2',
    washDark: 'rgba(225,29,72,0.12)',
    iconWash: '#FFE4E6',
    iconWashDark: 'rgba(251,113,133,0.22)',
    stripe: '#F43F5E',
    unit: 'tickets',
  },
  compliance: {
    icon: 'ribbon-outline',
    accent: '#0E7490',
    accentDark: '#67E8F9',
    wash: '#ECFEFF',
    washDark: 'rgba(8,145,178,0.12)',
    iconWash: '#CFFAFE',
    iconWashDark: 'rgba(34,211,238,0.20)',
    stripe: '#06B6D4',
    unit: 'profiles',
  },
};

const CRITICAL_THEME: CategoryTheme = {
  icon: 'alert-circle',
  accent: '#B91C1C',
  accentDark: '#FCA5A5',
  wash: '#FEF2F2',
  washDark: 'rgba(220,38,38,0.14)',
  iconWash: '#FEE2E2',
  iconWashDark: 'rgba(248,113,113,0.22)',
  stripe: '#EF4444',
  unit: 'alerts',
};

const FALLBACK_THEME: CategoryTheme = {
  icon: 'flag-outline',
  accent: '#334155',
  accentDark: '#CBD5E1',
  wash: '#F8FAFC',
  washDark: 'rgba(148,163,184,0.10)',
  iconWash: '#E2E8F0',
  iconWashDark: 'rgba(148,163,184,0.18)',
  stripe: '#94A3B8',
  unit: 'items',
};

function themeFor(item: ActionCenterItem): CategoryTheme {
  if (item.severity === 'CRITICAL') {
    const cat = CATEGORY_THEME[item.category] || CRITICAL_THEME;
    return { ...CRITICAL_THEME, icon: cat.icon };
  }
  return CATEGORY_THEME[item.category] || FALLBACK_THEME;
}

function formatInrCompact(amount: number): string {
  if (amount >= 1_00_00_000) {
    const cr = amount / 1_00_00_000;
    return `₹${cr.toFixed(cr >= 10 ? 1 : 2).replace(/\.0$/, '')} Cr`;
  }
  if (amount >= 1_00_000) {
    return `₹${(amount / 1_00_000).toFixed(1)}L`;
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatInrFull(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    attendance: 'Attendance',
    finance: 'Fee recovery',
    governance: 'Admissions',
    transport: 'Transport',
    academics: 'Academics',
    staff: 'Staff',
    support: 'Help desk',
    compliance: 'UDISE',
  };
  return labels[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

function briefingBit(item: ActionCenterItem): string {
  const n = item.count ?? 0;
  switch (item.category) {
    case 'attendance':
      return `${n} at attendance risk`;
    case 'finance':
      return item.amount ? `${formatInrCompact(item.amount)} overdue` : `${n} fee defaulters`;
    case 'governance':
      return `${n} missing documents`;
    case 'transport':
      return `${n} transport alert${n === 1 ? '' : 's'}`;
    case 'staff':
      return `${n} leave request${n === 1 ? '' : 's'}`;
    case 'academics':
      return `${n} syllabus delay${n === 1 ? '' : 's'}`;
    case 'support':
      return `${n} urgent ticket${n === 1 ? '' : 's'}`;
    case 'compliance':
      return `${n} UDISE gap${n === 1 ? '' : 's'}`;
    default:
      return item.title;
  }
}

function itemMetric(item: ActionCenterItem): { hero: string; unit: string } | null {
  if (item.amount && item.amount > 0) {
    return {
      hero: formatInrCompact(item.amount),
      unit: item.count ? `${item.count} student${item.count === 1 ? '' : 's'}` : 'overdue',
    };
  }
  if (item.count != null) {
    const theme = CATEGORY_THEME[item.category] || FALLBACK_THEME;
    return {
      hero: item.count.toLocaleString('en-IN'),
      unit: item.count === 1 ? theme.unit.replace(/s$/, '') : theme.unit,
    };
  }
  return null;
}

function relativeTime(iso?: string): string | null {
  if (!iso) return null;
  const delta = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(delta) || delta < 0) return 'Just now';
  const mins = Math.floor(delta / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return 'Earlier today';
}

function healthColor(status: HealthStatus): string {
  if (status === 'CRITICAL') return '#EF4444';
  if (status === 'ATTENTION') return '#F59E0B';
  if (status === 'UNKNOWN') return '#94A3B8';
  return '#10B981';
}

function healthLabel(status: HealthStatus): string {
  if (status === 'CRITICAL') return 'Critical';
  if (status === 'ATTENTION') return 'Review';
  if (status === 'UNKNOWN') return 'Unknown';
  return 'Healthy';
}

export function PrincipalActionCenter() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const [data, setData] = useState<ActionCenterResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    GovernanceService.getActionCenterData()
      .then((res) => {
        if (mounted) setData(res);
      })
      .catch((err) => {
        console.warn('Failed to load Principal Action Center data', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const queue = useMemo(() => {
    if (!data) return [] as ActionCenterItem[];
    return [...data.sections.critical, ...data.sections.needs_attention];
  }, [data]);

  const briefing = useMemo(() => {
    if (!data) return '';
    if (data.summary.all_clear) return 'Campus is operating normally — no urgent exceptions.';
    if (data.summary.critical_count > 0) {
      return `${data.summary.critical_count} critical alert${data.summary.critical_count === 1 ? '' : 's'} need immediate action`;
    }
    return queue.map(briefingBit).join('  ·  ');
  }, [data, queue]);

  const navigateTo = (url?: string) => {
    if (!url) return;
    Haptics.selectionAsync();
    try {
      router.push(url as any);
    } catch {
      // Fallback
    }
  };

  if (loading) {
    return (
      <View style={[styles.shell, isDark ? styles.shellDark : styles.shellLight]}>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#4F46E5" />
          <Text style={[styles.loadingText, isDark && { color: '#94A3B8' }]}>
            Preparing today’s operational briefing…
          </Text>
        </View>
        <View style={styles.skeletonStack}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.skeletonBar, isDark ? styles.skeletonBarDark : styles.skeletonBarLight]}
            />
          ))}
        </View>
      </View>
    );
  }

  if (!data) return null;

  const { summary, sections, system_health, generated_at } = data;
  const isClear = summary.all_clear;
  const showGroupHeaders = sections.critical.length > 0 && sections.needs_attention.length > 0;
  const updated = relativeTime(generated_at);
  const infoItems = isClear ? [] : sections.informational.filter((item) => item.action_url);

  return (
    <Animated.View
      entering={enter(40)}
      style={[styles.shell, isDark ? styles.shellDark : styles.shellLight]}
    >
      <LinearGradient
        colors={
          isClear
            ? isDark
              ? ['rgba(16,185,129,0.14)', 'transparent']
              : ['rgba(16,185,129,0.10)', 'rgba(255,255,255,0)']
            : isDark
              ? ['rgba(79,70,229,0.18)', 'transparent']
              : ['rgba(99,102,241,0.10)', 'rgba(255,255,255,0)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerWash}
      />

      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <LinearGradient
            colors={isClear ? ['#10B981', '#059669'] : ['#4F46E5', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconBadge}
          >
            <Ionicons name={isClear ? 'shield-checkmark' : 'flash'} size={18} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.titleCopy}>
            <View style={styles.titleLine}>
              <Text style={[styles.title, isDark && styles.titleDark]}>Principal Action Center</Text>
              {updated ? (
                <Text style={[styles.updated, isDark && styles.updatedDark]}>{updated}</Text>
              ) : null}
            </View>
            <Text
              style={[styles.briefing, isDark && styles.briefingDark]}
              numberOfLines={compact ? 2 : 1}
            >
              {briefing}
            </Text>
          </View>
        </View>

        <View style={styles.pills}>
          {summary.critical_count > 0 && (
            <View style={[styles.pill, styles.pillCritical, isDark && styles.pillCriticalDark]}>
              <View style={styles.liveDot} />
              <Text style={styles.pillCriticalText}>
                {summary.critical_count} critical
              </Text>
            </View>
          )}
          {summary.needs_attention_count > 0 && (
            <View style={[styles.pill, styles.pillReview, isDark && styles.pillReviewDark]}>
              <Text style={[styles.pillReviewText, isDark && { color: '#FCD34D' }]}>
                {summary.needs_attention_count} to review
              </Text>
            </View>
          )}
          {isClear && (
            <View style={[styles.pill, styles.pillHealthy, isDark && styles.pillHealthyDark]}>
              <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
              <Text style={styles.pillHealthyText}>All clear</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.heartbeat} accessibilityLabel="Campus subsystem health">
        {Object.entries(system_health).map(([mod, status]) => (
          <View
            key={mod}
            style={[styles.heartbeatSeg, { backgroundColor: healthColor(status) }]}
          />
        ))}
      </View>

      {isClear ? (
        <Animated.View entering={FadeIn.duration(280)} style={[styles.clearPanel, isDark && styles.clearPanelDark]}>
          <LinearGradient
            colors={isDark ? ['rgba(16,185,129,0.18)', 'rgba(16,185,129,0.05)'] : ['#ECFDF5', '#F0FDF4']}
            style={styles.clearIconWrap}
          >
            <Ionicons name="leaf-outline" size={26} color="#059669" />
          </LinearGradient>
          <Text style={[styles.clearTitle, isDark && { color: '#6EE7B7' }]}>
            You’re clear for the day
          </Text>
          <Text style={[styles.clearBody, isDark && { color: '#94A3B8' }]}>
            {summary.empty_state_message ||
              'No safety alerts, attendance risks, or pending approvals need you right now.'}
          </Text>
        </Animated.View>
      ) : (
        <View style={styles.queue}>
          {showGroupHeaders && sections.critical.length > 0 && (
            <Text style={[styles.groupLabel, isDark && styles.groupLabelDark]}>Needs action now</Text>
          )}
          {sections.critical.map((item, index) => (
            <ActionRow
              key={item.id}
              item={item}
              isDark={isDark}
              compact={compact}
              delay={80 + index * 50}
              onPress={() => navigateTo(item.action_url)}
            />
          ))}

          {showGroupHeaders && sections.needs_attention.length > 0 && (
            <Text style={[styles.groupLabel, styles.groupLabelSpaced, isDark && styles.groupLabelDark]}>
              Review today
            </Text>
          )}
          {sections.needs_attention.map((item, index) => (
            <ActionRow
              key={item.id}
              item={item}
              isDark={isDark}
              compact={compact}
              delay={120 + index * 50}
              onPress={() => navigateTo(item.action_url)}
            />
          ))}

          {infoItems.length > 0 && (
            <View style={styles.infoBlock}>
              <Text style={[styles.groupLabel, isDark && styles.groupLabelDark]}>Also noted</Text>
              {infoItems.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => navigateTo(item.action_url)}
                  style={({ pressed, hovered }: any) => [
                    styles.infoRow,
                    isDark ? styles.infoRowDark : styles.infoRowLight,
                    (hovered || pressed) && styles.infoRowHover,
                    isWeb && { cursor: 'pointer' as const },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={isDark ? '#93C5FD' : '#2563EB'}
                  />
                  <Text style={[styles.infoTitle, isDark && { color: '#E2E8F0' }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={isDark ? '#64748B' : '#94A3B8'} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={[styles.healthDock, isDark && styles.healthDockDark]}>
        <View style={styles.healthHeader}>
          <Text style={[styles.healthEyebrow, isDark && styles.healthEyebrowDark]}>Campus systems</Text>
          <Text style={[styles.healthHint, isDark && styles.healthHintDark]}>Tap a module to open it</Text>
        </View>
        <View style={styles.healthGrid}>
          {Object.entries(system_health).map(([mod, status]) => {
            const meta = SUBSYSTEM_META[mod] || {
              icon: 'ellipse-outline' as IconName,
              label: mod.charAt(0).toUpperCase() + mod.slice(1),
            };
            const color = healthColor(status);
            const isCrit = status === 'CRITICAL';
            const isAttn = status === 'ATTENTION';

            return (
              <Pressable
                key={mod}
                onPress={() => navigateTo(SUBSYSTEM_ROUTES[mod.toLowerCase()])}
                style={({ pressed, hovered }: any) => [
                  styles.healthTile,
                  isDark ? styles.healthTileDark : styles.healthTileLight,
                  isCrit && (isDark ? styles.healthTileCritDark : styles.healthTileCrit),
                  isAttn && (isDark ? styles.healthTileAttnDark : styles.healthTileAttn),
                  (hovered || pressed) && styles.healthTileHover,
                  isWeb && { cursor: 'pointer' as const },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${meta.label}, ${healthLabel(status)}`}
              >
                <View style={[styles.healthIcon, { backgroundColor: `${color}18` }]}>
                  <Ionicons name={meta.icon} size={15} color={color} />
                </View>
                <Text style={[styles.healthName, isDark && { color: '#E2E8F0' }]} numberOfLines={1}>
                  {meta.label}
                </Text>
                <Text style={[styles.healthStatus, { color }]}>{healthLabel(status)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

function ActionRow({
  item,
  isDark,
  compact,
  delay,
  onPress,
}: {
  item: ActionCenterItem;
  isDark: boolean;
  compact: boolean;
  delay: number;
  onPress: () => void;
}) {
  const theme = themeFor(item);
  const accent = isDark ? theme.accentDark : theme.accent;
  const metric = itemMetric(item);
  const clickable = Boolean(item.action_url);
  const isCritical = item.severity === 'CRITICAL';
  const cta = item.action_label || (isCritical ? 'Resolve' : 'Review');

  const body = (
    <>
      <View style={[styles.stripe, { backgroundColor: theme.stripe }]} />
      <View style={[styles.rowInner, compact && styles.rowInnerCompact]}>
        <View style={styles.rowMain}>
          <View
            style={[
              styles.itemIcon,
              { backgroundColor: isDark ? theme.iconWashDark : theme.iconWash },
            ]}
          >
            <Ionicons name={theme.icon} size={20} color={accent} />
          </View>
          <View style={styles.itemCopy}>
            <Text style={[styles.itemEyebrow, { color: accent }]}>
              {isCritical ? 'Critical  ·  ' : ''}
              {categoryLabel(item.category)}
            </Text>
            <Text style={[styles.itemTitle, isDark && styles.itemTitleDark]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[styles.itemDesc, isDark && styles.itemDescDark]} numberOfLines={2}>
              {item.amount
                ? `${item.count ?? 0} student${item.count === 1 ? '' : 's'}  ·  ${formatInrFull(item.amount)} pending past 30 days`
                : item.description}
            </Text>
          </View>
        </View>

        <View style={[styles.rowMeta, compact && styles.rowMetaCompact]}>
          {metric ? (
            <View style={[styles.metric, compact && styles.metricCompact]}>
              <Text style={[styles.metricHero, { color: accent }]} numberOfLines={1}>
                {metric.hero}
              </Text>
              <Text style={[styles.metricUnit, isDark && styles.metricUnitDark]}>{metric.unit}</Text>
            </View>
          ) : null}
          {clickable ? (
            <View
              style={[
                styles.cta,
                isCritical ? styles.ctaCritical : isDark ? styles.ctaGhostDark : styles.ctaGhost,
              ]}
            >
              <Text
                style={[
                  styles.ctaText,
                  isCritical ? styles.ctaTextCritical : { color: accent },
                ]}
                numberOfLines={1}
              >
                {cta}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={13}
                color={isCritical ? '#FFFFFF' : accent}
              />
            </View>
          ) : null}
        </View>
      </View>
    </>
  );

  const surfaceStyle = [
    styles.itemCard,
    {
      backgroundColor: isDark ? theme.washDark : theme.wash,
      borderColor: isDark ? `${theme.stripe}44` : `${theme.stripe}33`,
    },
    isCritical && (isDark ? styles.itemCardCriticalDark : styles.itemCardCritical),
  ];

  if (!clickable) {
    return (
      <Animated.View entering={enter(delay)} style={surfaceStyle}>
        {body}
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={enter(delay)}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${cta}`}
        style={({ pressed, hovered }: any) => [
          ...surfaceStyle,
          (hovered || pressed) && styles.itemCardLift,
          isWeb && { cursor: 'pointer' as const },
        ]}
      >
        {body}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      web: {
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08), 0 2px 0 rgba(255,255,255,0.8) inset',
      },
      ios: {
        shadowColor: '#0F172A',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 24,
      },
      default: {
        elevation: 3,
      },
    }),
  },
  shellLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  shellDark: {
    backgroundColor: '#111827',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 132,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  skeletonStack: {
    gap: 10,
  },
  skeletonBar: {
    height: 72,
    borderRadius: 16,
  },
  skeletonBarLight: {
    backgroundColor: '#F1F5F9',
  },
  skeletonBarDark: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 14,
    zIndex: 1,
  },
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
    minWidth: 220,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    ...Platform.select({
      web: { boxShadow: '0 8px 16px rgba(79,70,229,0.28)' },
      default: {
        shadowColor: '#4F46E5',
        shadowOpacity: 0.28,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 10,
      },
    }),
  },
  titleCopy: {
    flex: 1,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  titleDark: {
    color: '#F8FAFC',
  },
  updated: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  updatedDark: {
    color: '#64748B',
  },
  briefing: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
    fontWeight: '500',
  },
  briefingDark: {
    color: '#94A3B8',
  },
  pills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  pillCritical: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  pillCriticalDark: {
    backgroundColor: 'rgba(220,38,38,0.16)',
    borderColor: 'rgba(248,113,113,0.35)',
  },
  pillCriticalText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.2,
  },
  pillReview: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  pillReviewDark: {
    backgroundColor: 'rgba(245,158,11,0.16)',
    borderColor: 'rgba(251,191,36,0.32)',
  },
  pillReviewText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.2,
  },
  pillHealthy: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    gap: 4,
  },
  pillHealthyDark: {
    backgroundColor: 'rgba(22,163,74,0.16)',
    borderColor: 'rgba(74,222,128,0.28)',
  },
  pillHealthyText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  heartbeat: {
    flexDirection: 'row',
    gap: 5,
    height: 5,
    marginBottom: 16,
    zIndex: 1,
  },
  heartbeatSeg: {
    flex: 1,
    borderRadius: 99,
  },
  clearPanel: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 4,
  },
  clearPanelDark: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  clearIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  clearTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#047857',
  },
  clearBody: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 420,
  },
  queue: {
    gap: 10,
    zIndex: 1,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#94A3B8',
    marginBottom: 2,
    marginLeft: 2,
  },
  groupLabelSpaced: {
    marginTop: 8,
  },
  groupLabelDark: {
    color: '#64748B',
  },
  itemCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    ...Platform.select({
      web: {
        transitionDuration: '160ms',
        transitionProperty: 'transform, box-shadow',
      } as any,
      default: {},
    }),
  },
  itemCardCritical: {
    ...Platform.select({
      web: { boxShadow: '0 10px 24px rgba(239,68,68,0.12)' },
      default: {
        shadowColor: '#EF4444',
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
      },
    }),
  },
  itemCardCriticalDark: {
    ...Platform.select({
      web: { boxShadow: '0 10px 24px rgba(239,68,68,0.18)' },
      default: {},
    }),
  },
  itemCardLift: Platform.select({
    web: {
      transform: [{ translateY: -1 }],
      boxShadow: '0 14px 28px rgba(15,23,42,0.12)',
    } as any,
    default: {
      opacity: 0.92,
    },
  }),
  stripe: {
    width: 5,
  },
  rowInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  rowInnerCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    minWidth: 0,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCopy: {
    flex: 1,
    minWidth: 0,
  },
  itemEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  itemTitleDark: {
    color: '#F8FAFC',
  },
  itemDesc: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 17,
    color: '#64748B',
    fontWeight: '500',
  },
  itemDescDark: {
    color: '#94A3B8',
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingLeft: 4,
  },
  rowMetaCompact: {
    justifyContent: 'space-between',
    paddingLeft: 56,
  },
  metric: {
    alignItems: 'flex-end',
    minWidth: 72,
  },
  metricCompact: {
    alignItems: 'flex-start',
  },
  metricHero: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  metricUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 1,
  },
  metricUnitDark: {
    color: '#64748B',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  ctaGhost: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  ctaGhostDark: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  ctaCritical: {
    backgroundColor: '#DC2626',
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '800',
  },
  ctaTextCritical: {
    color: '#FFFFFF',
  },
  infoBlock: {
    marginTop: 8,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoRowLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  infoRowDark: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  infoRowHover: {
    opacity: 0.86,
  },
  infoTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  healthDock: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  healthDockDark: {
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  healthEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: '#94A3B8',
  },
  healthEyebrowDark: {
    color: '#64748B',
  },
  healthHint: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },
  healthHintDark: {
    color: '#475569',
  },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  healthTile: {
    flexGrow: 1,
    flexBasis: 96,
    minWidth: 96,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 4,
  },
  healthTileLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  healthTileDark: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  healthTileCrit: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  healthTileCritDark: {
    backgroundColor: 'rgba(220,38,38,0.12)',
    borderColor: 'rgba(248,113,113,0.32)',
  },
  healthTileAttn: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  healthTileAttnDark: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(251,191,36,0.28)',
  },
  healthTileHover: {
    transform: [{ translateY: -1 }],
  },
  healthIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  healthName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  healthStatus: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
});
