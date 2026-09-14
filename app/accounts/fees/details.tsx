import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Animated, Platform, Pressable, Modal, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import AppTextInput from '@/src/components/AppTextInput';
import { alertCompat } from '../../../src/utils/crossPlatformAlert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AdminHeader from '../../../src/components/AdminHeader';
import { useAccountsWebChrome } from '../../../src/contexts/AccountsWebChromeContext';
import { FeeService } from '../../../src/services/feeService';
import { TransportFeeService } from '../../../src/services/transportFeeService';
import { StudentFee, FeeResponse, TransportDue } from '../../../src/types/models';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Theme } from '../../../src/theme/themes';
import LogoLoader from '../../../src/components/LogoLoader';
import { generateUUID } from './collect';

const IS_WEB = Platform.OS === 'web';
const webCursor = IS_WEB ? ({ cursor: 'pointer' } as const) : null;

type LedgerFeeItem = StudentFee & {
  lineDue: number;
  paidRatio: number;
  isTransport?: boolean;
  routeName?: string;
  stopName?: string | null;
};

function formatInr(n: number | string): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return '₹0';
  const hasPaise = Math.round(v * 100) % 100 !== 0;
  return `₹${v.toLocaleString('en-IN', {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function lineDueOf(fee: Pick<StudentFee, 'amount_due' | 'discount' | 'amount_paid'>): number {
  return Math.max(0, Number(fee.amount_due) - Number(fee.discount || 0) - Number(fee.amount_paid || 0));
}

function transportDueToLedgerItem(transport: TransportDue): LedgerFeeItem | null {
  if (!transport || transport.fee_not_set || transport.fee_amount == null) return null;

  const feeAmount = Number(transport.fee_amount);
  const paidAmount = Number(transport.paid_amount || 0);
  const balanceDue = Number(transport.balance_due ?? Math.max(feeAmount - paidAmount, 0));
  const amountDue = feeAmount;
  const discount = 0;
  const due = Math.max(0, amountDue - discount - paidAmount);

  return {
    id: `transport-${transport.assignment_id || transport.route_id}`,
    student_id: '',
    amount_due: feeAmount,
    amount_paid: paidAmount,
    discount: 0,
    status: balanceDue <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'pending',
    due_date: '',
    fee_type: 'Transport Fee',
    isTransport: true,
    routeName: transport.route_name,
    stopName: transport.stop_name,
    lineDue: due,
    paidRatio: amountDue > 0 ? paidAmount / amountDue : 0,
  };
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string; soft: string }> = {
  paid: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981', label: 'Paid', soft: 'rgba(16,185,129,0.10)' },
  partial: { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B', label: 'Partial', soft: 'rgba(245,158,11,0.10)' },
  pending: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444', label: 'Pending', soft: 'rgba(239,68,68,0.08)' },
  overdue: { bg: '#FEE2E2', text: '#7F1D1D', dot: '#DC2626', label: 'Overdue', soft: 'rgba(220,38,38,0.10)' },
};
const STATUS_CONFIG_DARK: Record<string, { bg: string; text: string; dot: string; soft: string }> = {
  paid: { bg: 'rgba(16,185,129,0.18)', text: '#34D399', dot: '#10B981', soft: 'rgba(16,185,129,0.10)' },
  partial: { bg: 'rgba(245,158,11,0.18)', text: '#FCD34D', dot: '#F59E0B', soft: 'rgba(245,158,11,0.10)' },
  pending: { bg: 'rgba(239,68,68,0.18)', text: '#FCA5A5', dot: '#EF4444', soft: 'rgba(239,68,68,0.10)' },
  overdue: { bg: 'rgba(220,38,38,0.22)', text: '#F87171', dot: '#DC2626', soft: 'rgba(220,38,38,0.12)' },
};

function ProgressBar({ paidRatio, isDark }: { paidRatio: number; isDark: boolean }) {
  const width = useRef(new Animated.Value(0)).current;
  const clamped = Math.min(Math.max(paidRatio, 0), 1);
  const color = clamped >= 1 ? '#10B981' : clamped >= 0.5 ? '#F59E0B' : '#EF4444';

  useEffect(() => {
    Animated.timing(width, {
      toValue: clamped,
      duration: 760,
      delay: 180,
      useNativeDriver: false,
    }).start();
  }, [clamped, width]);

  return (
    <View style={[progressStyles.track, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.07)' }]}>
      <Animated.View
        style={[
          progressStyles.fill,
          {
            width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 99,
  },
});

function FeeCard({
  fee, index, isDark,
  onPayment,
  selectMode = false,
  selected = false,
  onToggleSelect,
}: {
  fee: LedgerFeeItem; index: number; isDark: boolean;
  onPayment: (f: LedgerFeeItem) => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (f: LedgerFeeItem) => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const isPaid = fee.status === 'paid' || fee.lineDue <= 0;
  const selectable = !fee.isTransport && !isPaid && fee.lineDue > 0;
  const s = isDark
    ? { ...STATUS_CONFIG[fee.status], ...(STATUS_CONFIG_DARK[fee.status] || STATUS_CONFIG_DARK.pending) }
    : STATUS_CONFIG[fee.status] || STATUS_CONFIG.pending;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      tension: 60,
      friction: 11,
      delay: 80 + index * 70,
      useNativeDriver: true,
    }).start();
  }, [anim, index]);

  const cardBg = isDark ? '#1A2130' : '#FFFFFF';
  const textPri = isDark ? '#F8FAFC' : '#0F172A';
  const textSec = isDark ? 'rgba(255,255,255,0.48)' : '#64748B';
  const border = selected
    ? '#10B981'
    : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(76,90,120,0.08)';

  const onCardPress = () => {
    if (selectMode) {
      if (selectable) onToggleSelect?.(fee);
      return;
    }
    if (!isPaid) onPayment(fee);
  };

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
      marginBottom: 12,
    }}>
      <Pressable
        style={[
          fcStyles.card,
          (!selectMode && !isPaid) || (selectMode && selectable) ? webCursor : null,
          {
            backgroundColor: cardBg,
            borderColor: border,
            borderWidth: selected ? 2 : 1,
            opacity: selectMode && !selectable ? 0.55 : 1,
          },
        ]}
        onPress={onCardPress}
        disabled={(selectMode && !selectable) || (!selectMode && isPaid)}
        accessibilityRole="button"
        accessibilityLabel={`${fee.fee_type}, ${s.label}, due ${formatInr(fee.lineDue)}`}
      >
        <View style={[StyleSheet.absoluteFill, { borderRadius: 22, overflow: 'hidden' }]} pointerEvents="none">
          <LinearGradient
            colors={isDark
              ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']
              : ['rgba(255,255,255,0.88)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.7, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[fcStyles.statusWash, { backgroundColor: s.soft }]} />
        </View>
        <View style={[fcStyles.accent, { backgroundColor: s.dot }]} />

        <View style={fcStyles.header}>
          <View style={fcStyles.headerLeft}>
            {selectMode && (
              <View style={[
                fcStyles.checkbox,
                selected && fcStyles.checkboxOn,
                !selectable && { borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E2E8F0' },
              ]}>
                {selected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[fcStyles.feeType, { color: textPri }]} numberOfLines={1}>
                {fee.fee_type}
              </Text>
              {fee.isTransport && (fee.routeName || fee.stopName) ? (
                <Text style={[fcStyles.feeSub, { color: textSec }]} numberOfLines={1}>
                  {[fee.routeName, fee.stopName].filter(Boolean).join(' · ')}
                </Text>
              ) : (
                <Text style={[fcStyles.feeSub, { color: textSec }]}>
                  {Math.round(fee.paidRatio * 100)}% collected
                </Text>
              )}
            </View>
          </View>
          <View style={[fcStyles.badge, { backgroundColor: s.bg }]}>
            <View style={[fcStyles.badgeDot, { backgroundColor: s.dot }]} />
            <Text style={[fcStyles.badgeText, { color: s.text }]}>
              {STATUS_CONFIG[fee.status]?.label ?? fee.status}
            </Text>
          </View>
        </View>

        <View style={fcStyles.progressWrap}>
          <ProgressBar paidRatio={fee.paidRatio} isDark={isDark} />
        </View>

        <View style={fcStyles.grid}>
          <NumCell label="Total" value={formatInr(fee.amount_due)} color={textPri} textSec={textSec} />
          <NumCell label="Paid" value={formatInr(fee.amount_paid)} color="#059669" textSec={textSec} />
          {fee.discount > 0 && (
            <NumCell label="Waiver" value={`-${formatInr(fee.discount)}`} color="#6366F1" textSec={textSec} />
          )}
          <NumCell
            label={isPaid ? 'Balance' : 'Due'}
            value={formatInr(fee.lineDue)}
            color={fee.lineDue > 0 ? '#DC2626' : '#059669'}
            textSec={textSec}
            emphasis
          />
        </View>

        <View style={[fcStyles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)' }]} />

        {selectMode ? (
          <View style={[
            fcStyles.selectHintBtn,
            selected && { backgroundColor: isDark ? 'rgba(16,185,129,0.16)' : '#ECFDF5' },
          ]}>
            <Text style={[
              fcStyles.selectHintText,
              {
                color: !selectable
                  ? (isDark ? 'rgba(255,255,255,0.32)' : '#94A3B8')
                  : selected
                    ? '#059669'
                    : (isDark ? 'rgba(255,255,255,0.62)' : '#64748B'),
              },
            ]}>
              {!selectable
                ? (fee.isTransport ? 'Collect transport separately' : 'Nothing due')
                : selected ? 'Selected for combined receipt' : 'Tap to include in one receipt'}
            </Text>
          </View>
        ) : isPaid ? (
          <View style={fcStyles.settledRow}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={fcStyles.settledText}>Fully settled</Text>
          </View>
        ) : (
          <Pressable
            style={[fcStyles.collectBtn, webCursor]}
            onPress={() => onPayment(fee)}
            accessibilityRole="button"
            accessibilityLabel={`Collect ${formatInr(fee.lineDue)} for ${fee.fee_type}`}
          >
            <Ionicons name="wallet-outline" size={16} color="#fff" />
            <Text style={fcStyles.collectLabel}>
              Collect {formatInr(fee.lineDue)}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}

function NumCell({ label, value, color, textSec, emphasis }: {
  label: string; value: string; color: string; textSec: string; emphasis?: boolean;
}) {
  return (
    <View style={fcStyles.numCell}>
      <Text style={[fcStyles.numLabel, { color: textSec }]}>{label}</Text>
      <Text style={[fcStyles.numValue, { color, fontSize: emphasis ? 16 : 14 }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const fcStyles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 18,
    paddingLeft: 22,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#6B7A99',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 3 },
      web: {
        boxShadow: '0 12px 28px -14px rgba(76,90,120,0.28), 0 2px 6px rgba(76,90,120,0.08)',
      } as any,
    }),
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 16,
    bottom: 16,
    width: 4,
    borderRadius: 4,
  },
  statusWash: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 140,
    height: 90,
    borderBottomLeftRadius: 80,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 8, borderWidth: 2, borderColor: '#10B981',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#10B981' },
  selectHintBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  selectHintText: { fontSize: 13, fontWeight: '700' },
  feeType: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  feeSub: { fontSize: 12, fontWeight: '600', marginTop: 3 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },
  progressWrap: { marginTop: 14, marginBottom: 14 },
  grid: { flexDirection: 'row', justifyContent: 'space-between' },
  numCell: { alignItems: 'flex-start', flex: 1, paddingRight: 6 },
  numLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, marginBottom: 4, textTransform: 'uppercase' },
  numValue: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  divider: { height: 1, marginVertical: 14 },
  collectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#059669',
    ...Platform.select({
      ios: {
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  collectLabel: { color: '#fff', fontSize: 14, fontWeight: '800' },
  settledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  settledText: { fontSize: 13, fontWeight: '700', color: '#059669' },
});

export default function StudentFeeLedger() {
  const { theme, isDark } = useTheme();
  const { shellActive } = useAccountsWebChrome();
  const { width } = useWindowDimensions();
  const wide = width >= 960;
  const styles = useMemo(() => getStyles(theme, isDark, wide), [theme, isDark, wide]);
  const router = useRouter();
  const params = useLocalSearchParams();
  const studentId = params.studentId as string;
  const studentName = params.name as string;
  const fatherNameParam = params.fatherName as string | undefined;
  const fatherMobileParam = params.fatherMobile as string | undefined;

  const [loading, setLoading] = useState(true);
  const [feeData, setFeeData] = useState<FeeResponse | null>(null);
  const [transportCollectDue, setTransportCollectDue] = useState<number | null>(null);
  const [transportAmount, setTransportAmount] = useState('');
  const [transportMode, setTransportMode] = useState<'cash' | 'upi' | 'cheque'>('cash');
  const [transportRemarks, setTransportRemarks] = useState('');
  const [transportSubmitting, setTransportSubmitting] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedFees, setSelectedFees] = useState<LedgerFeeItem[]>([]);

  const toggleSelectFee = (fee: LedgerFeeItem) => {
    setSelectedFees((prev) =>
      prev.some((f) => f.id === fee.id)
        ? prev.filter((f) => f.id !== fee.id)
        : [...prev, fee],
    );
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedFees([]);
  };

  const selectedTotal = selectedFees.reduce((sum, f) => sum + f.lineDue, 0);

  const goCollectMultiple = (items?: LedgerFeeItem[]) => {
    const source = items ?? selectedFees;
    const payload = source.map((f) => ({
      id: f.id,
      fee_type: f.fee_type,
      due: f.lineDue,
    }));
    router.push({
      pathname: '/accounts/fees/collect-multi' as any,
      params: {
        studentId,
        name: studentName,
        admissionNo: feeData?.student.admission_no,
        className: feeData?.student.class_name,
        sectionName: feeData?.student.section_name,
        fatherName: feeData?.student.father_name || fatherNameParam,
        fatherMobile: feeData?.student.father_mobile || fatherMobileParam,
        items: JSON.stringify(payload),
      },
    });
    exitSelectMode();
  };

  const headerAnim = useRef(new Animated.Value(0)).current;
  const summaryAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (studentId) loadLedger();
  }, [studentId]);

  const loadLedger = async () => {
    setLoading(true);
    try {
      const data = await FeeService.getStudentFees(studentId);
      setFeeData(data);
      Animated.stagger(60, [
        Animated.spring(headerAnim, { toValue: 1, tension: 65, friction: 10, useNativeDriver: true }),
        Animated.spring(summaryAnim, { toValue: 1, tension: 65, friction: 10, useNativeDriver: true }),
      ]).start();
    } catch {
      alertCompat('Error', 'Failed to load financial ledger');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = (fee: LedgerFeeItem) => {
    if (fee.isTransport) {
      const due = fee.lineDue;
      setTransportAmount(String(due));
      setTransportMode('cash');
      setTransportRemarks('');
      setTransportCollectDue(due);
      return;
    }

    router.push({
      pathname: '/accounts/fees/collect' as any,
      params: {
        feeId: fee.id, studentId,
        name: studentName,
        admissionNo: feeData?.student.admission_no,
        className: feeData?.student.class_name,
        sectionName: feeData?.student.section_name,
        fatherName: feeData?.student.father_name || fatherNameParam,
        fatherMobile: feeData?.student.father_mobile || fatherMobileParam,
        feeType: fee.fee_type,
        due: fee.lineDue.toString(),
      },
    });
  };

  const handleTransportCollect = async () => {
    const amount = Number(transportAmount);
    const maxDue = Number(transportCollectDue || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      alertCompat('Invalid amount', 'Enter a valid collection amount.');
      return;
    }
    if (amount > maxDue) {
      alertCompat('Amount too high', `Maximum collectable is ${formatInr(maxDue)}.`);
      return;
    }

    setTransportSubmitting(true);
    try {
      const result = await TransportFeeService.collect({
        student_id: studentId,
        amount,
        payment_method: transportMode,
        transaction_ref: generateUUID(),
        remarks: transportRemarks.trim() || undefined,
      });
      setTransportCollectDue(null);
      alertCompat(
        'Payment collected',
        `Receipt ${result.receipt.receipt_no} — ${formatInr(Number(result.receipt.total_amount))}`,
      );
      await loadLedger();
    } catch {
      alertCompat('Error', 'Failed to collect transport fee');
    } finally {
      setTransportSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <LogoLoader size={52} color="#6B2FA0" />
        <Text style={styles.loadingText}>Loading fee ledger…</Text>
      </View>
    );
  }

  const summary = feeData?.summary;
  const transportDue = feeData?.transport_due ?? summary?.transport_due ?? null;
  const transportItem = transportDue ? transportDueToLedgerItem(transportDue) : null;
  const ledgerItems: LedgerFeeItem[] = [
    ...(feeData?.fees ?? []).map((fee) => {
      const due = lineDueOf(fee);
      return {
        ...fee,
        lineDue: due,
        paidRatio: fee.amount_due > 0 ? fee.amount_paid / fee.amount_due : 0,
      };
    }),
    ...(transportItem ? [transportItem] : []),
  ];
  const unpaidTuition = ledgerItems.filter(
    (f) => !f.isTransport && f.status !== 'paid' && f.lineDue > 0,
  );
  const selectableCount = unpaidTuition.length;
  const unpaidTransport = ledgerItems.find((f) => f.isTransport && f.lineDue > 0);

  const tuitionDue = parseFloat(String(summary?.total_due || 0));
  const tuitionPaid = parseFloat(String(summary?.total_paid || 0));
  const transportFeeAmount = transportItem ? Number(transportItem.amount_due) : 0;
  const transportPaidAmount = transportItem ? Number(transportItem.amount_paid) : 0;
  const totalDue = tuitionDue + transportFeeAmount;
  const totalPaid = tuitionPaid + transportPaidAmount;
  const balance = parseFloat(String(summary?.total_balance ?? summary?.balance ?? 0));
  const overallRatio = totalDue > 0 ? totalPaid / totalDue : 0;
  const allClear = balance <= 0;
  const admissionNo = feeData?.student.admission_no;
  const classLine = [feeData?.student.class_name, feeData?.student.section_name].filter(Boolean).join(' · ');
  const fatherName = feeData?.student.father_name || fatherNameParam;

  const collectOutstanding = () => {
    if (unpaidTuition.length >= 2) {
      goCollectMultiple(unpaidTuition);
      return;
    }
    if (unpaidTuition.length === 1) {
      handlePayment(unpaidTuition[0]);
      return;
    }
    if (unpaidTransport) handlePayment(unpaidTransport);
  };

  return (
    <View style={styles.container}>
      {!shellActive && <AdminHeader title="Fee Ledger" showBackButton />}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[
          styles.heroCard,
          {
            opacity: headerAnim,
            transform: [{
              translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
            }],
          },
        ]}>
          <LinearGradient
            colors={allClear ? ['#0F3D32', '#14532D', '#166534'] : ['#1B1464', '#2E1A6B', '#4C1D95']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.7, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.heroTopRow}>
              <View style={styles.heroAvatar}>
                <Text style={styles.heroAvatarText}>
                  {(studentName || 'S').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.heroInfo}>
                <Text style={styles.heroName} numberOfLines={1}>{studentName}</Text>
                <Text style={styles.heroMeta} numberOfLines={1}>
                  {[admissionNo ? `#${admissionNo}` : null, classLine, fatherName ? `S/o ${fatherName}` : null]
                    .filter(Boolean)
                    .join('  ·  ')}
                </Text>
              </View>
              <View style={[styles.heroBadge, allClear ? styles.heroBadgeClear : styles.heroBadgeDue]}>
                <View style={[styles.heroBadgeDot, { backgroundColor: allClear ? '#86EFAC' : '#FCA5A5' }]} />
                <Text style={[styles.heroBadgeText, { color: allClear ? '#BBF7D0' : '#FECACA' }]}>
                  {allClear ? 'All clear' : 'Dues pending'}
                </Text>
              </View>
            </View>

            <View style={styles.heroBalanceRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroBalanceLabel}>
                  {allClear ? 'Nothing outstanding' : 'Amount outstanding'}
                </Text>
                <Text style={styles.heroBalanceValue}>{formatInr(balance)}</Text>
              </View>
              {!allClear && !selectMode ? (
                <Pressable style={[styles.heroCta, webCursor]} onPress={collectOutstanding}>
                  <Text style={styles.heroCtaText}>Collect now</Text>
                  <Ionicons name="arrow-forward" size={16} color="#1B1464" />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.overallProgress}>
              <View style={styles.overallProgressTrack}>
                <View style={[
                  styles.overallProgressFill,
                  {
                    width: `${Math.round(overallRatio * 100)}%` as any,
                    backgroundColor: allClear ? '#86EFAC' : '#C4B5FD',
                  },
                ]} />
              </View>
              <Text style={styles.overallProgressText}>
                {Math.round(overallRatio * 100)}% of {formatInr(totalDue)} collected
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[
          styles.summaryStrip,
          {
            opacity: summaryAnim,
            transform: [{
              translateY: summaryAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
            }],
          },
        ]}>
          <SummaryCell
            icon="albums-outline"
            label="Billed"
            value={formatInr(totalDue)}
            color={isDark ? '#F8FAFC' : '#0F172A'}
            isDark={isDark}
            tint={isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC'}
          />
          <SummaryCell
            icon="checkmark-circle-outline"
            label="Collected"
            value={formatInr(totalPaid)}
            color="#059669"
            isDark={isDark}
            tint={isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5'}
          />
          <SummaryCell
            icon="alert-circle-outline"
            label="Balance"
            value={formatInr(balance)}
            color={balance > 0 ? '#DC2626' : '#059669'}
            isDark={isDark}
            tint={balance > 0
              ? (isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2')
              : (isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5')}
          />
        </Animated.View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Fee breakdown</Text>
            <Text style={styles.sectionCount}>
              {ledgerItems.length} {ledgerItems.length === 1 ? 'item' : 'items'}
              {selectableCount > 0 ? ` · ${selectableCount} open` : ''}
            </Text>
          </View>
          {selectableCount >= 2 ? (
            <Pressable
              style={[styles.selectToggle, selectMode && styles.selectToggleOn, webCursor]}
              onPress={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            >
              <Ionicons
                name={selectMode ? 'close' : 'checkbox-outline'}
                size={15}
                color={selectMode ? '#64748B' : '#059669'}
              />
              <Text style={[styles.selectToggleText, selectMode && { color: isDark ? '#E2E8F0' : '#334155' }]}>
                {selectMode ? 'Cancel' : 'Combine receipts'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {ledgerItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={28} color={isDark ? '#64748B' : '#94A3B8'} />
            <Text style={styles.emptyTitle}>No fee lines yet</Text>
            <Text style={styles.emptySub}>This student does not have any billed fee types.</Text>
          </View>
        ) : (
          ledgerItems.map((fee, index) => (
            <FeeCard
              key={fee.id}
              fee={fee}
              index={index}
              isDark={isDark}
              onPayment={handlePayment}
              selectMode={selectMode}
              selected={selectedFees.some((f) => f.id === fee.id)}
              onToggleSelect={toggleSelectFee}
            />
          ))
        )}

        <Modal visible={transportCollectDue != null} transparent animationType="slide">
          <Pressable style={styles.modalOverlay} onPress={() => setTransportCollectDue(null)}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  <View style={styles.modalHandle} />
                  <Text style={styles.modalTitle}>Collect transport fee</Text>
                  <Text style={styles.modalSubtitle}>
                    {studentName}
                    {transportDue?.stop_name ? ` · ${transportDue.stop_name}` : ''}
                  </Text>
                  <Text style={styles.modalLabel}>
                    Amount · max {formatInr(Number(transportCollectDue || 0))}
                  </Text>
                  <AppTextInput
                    value={transportAmount}
                    onChangeText={setTransportAmount}
                    keyboardType="numeric"
                    placeholder="Enter amount"
                  />
                  <View style={styles.modeRow}>
                    {([
                      { id: 'cash' as const, label: 'Cash', icon: 'cash-outline' },
                      { id: 'upi' as const, label: 'UPI', icon: 'phone-portrait-outline' },
                      { id: 'cheque' as const, label: 'Cheque', icon: 'document-text-outline' },
                    ]).map((mode) => (
                      <Pressable
                        key={mode.id}
                        style={[
                          styles.modeChip,
                          webCursor,
                          transportMode === mode.id && styles.modeChipActive,
                        ]}
                        onPress={() => setTransportMode(mode.id)}
                      >
                        <Ionicons
                          name={mode.icon as any}
                          size={16}
                          color={transportMode === mode.id ? '#059669' : (isDark ? '#94A3B8' : '#64748B')}
                        />
                        <Text style={[
                          styles.modeText,
                          transportMode === mode.id && styles.modeTextActive,
                        ]}>
                          {mode.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.modalLabel}>Remarks</Text>
                  <AppTextInput
                    style={styles.remarksInput}
                    multiline
                    value={transportRemarks}
                    onChangeText={setTransportRemarks}
                    placeholder="Optional note for the receipt"
                  />
                  <Pressable
                    style={[styles.collectBtn, webCursor, transportSubmitting && { opacity: 0.7 }]}
                    onPress={handleTransportCollect}
                    disabled={transportSubmitting}
                  >
                    {transportSubmitting
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.collectBtnText}>Collect & generate receipt</Text>}
                  </Pressable>
                </ScrollView>
              </Pressable>
            </KeyboardAvoidingView>
          </Pressable>
        </Modal>

        <View style={{ height: selectMode ? 120 : 40 }} />
      </ScrollView>

      {selectMode && selectedFees.length > 0 && (
        <View style={styles.multiBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.multiBarCount}>
              {selectedFees.length} fee type{selectedFees.length === 1 ? '' : 's'} · one receipt
            </Text>
            <Text style={styles.multiBarTotal}>{formatInr(selectedTotal)}</Text>
          </View>
          <Pressable style={[styles.multiBarBtn, webCursor]} onPress={() => goCollectMultiple()}>
            <Text style={styles.multiBarBtnText}>Collect together</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

function SummaryCell({ icon, label, value, color, isDark, tint }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string; isDark: boolean; tint: string;
}) {
  return (
    <View style={[sumStyles.cell, { backgroundColor: tint }]}>
      <View style={sumStyles.iconRow}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={{
          fontSize: 11, fontWeight: '700', letterSpacing: 0.5,
          color: isDark ? 'rgba(255,255,255,0.45)' : '#64748B',
          textTransform: 'uppercase',
        }}>
          {label}
        </Text>
      </View>
      <Text style={{ fontSize: 18, fontWeight: '800', color, letterSpacing: -0.4 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const sumStyles = StyleSheet.create({
  cell: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 8,
    minWidth: 0,
  },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});

const getStyles = (theme: Theme, isDark: boolean, wide: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? '#0F1117' : '#EEF0F7',
    gap: 12,
  },
  loadingText: {
    color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    padding: wide ? 22 : 16,
    paddingTop: 12,
    maxWidth: 880,
    width: '100%',
    alignSelf: 'center',
  },
  heroCard: {
    borderRadius: 26,
    overflow: 'hidden',
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#1B1464',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.28,
        shadowRadius: 22,
      },
      android: { elevation: 8 },
      web: {
        boxShadow: '0 18px 40px -16px rgba(27,20,100,0.45)',
      } as any,
    }),
  },
  heroGradient: {
    padding: wide ? 24 : 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  heroAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  heroAvatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  heroInfo: { flex: 1, minWidth: 0 },
  heroName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  heroMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.62)',
    fontWeight: '600',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  heroBadgeDue: {
    backgroundColor: 'rgba(239,68,68,0.18)',
    borderColor: 'rgba(252,165,165,0.28)',
  },
  heroBadgeClear: {
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderColor: 'rgba(134,239,172,0.28)',
  },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  heroBalanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 16,
  },
  heroBalanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.58)',
    marginBottom: 4,
  },
  heroBalanceValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  heroCtaText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B1464',
  },
  overallProgress: { gap: 8 },
  overallProgressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 99,
    overflow: 'hidden',
  },
  overallProgressFill: {
    height: '100%',
    borderRadius: 99,
  },
  overallProgressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.58)',
    fontWeight: '600',
  },
  summaryStrip: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: isDark ? '#F8FAFC' : '#0F172A',
    letterSpacing: -0.2,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? 'rgba(255,255,255,0.38)' : '#94A3B8',
    marginTop: 2,
  },
  selectToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5',
  },
  selectToggleOn: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
  },
  selectToggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: isDark ? '#1A2130' : '#FFFFFF',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: isDark ? '#E2E8F0' : '#0F172A',
  },
  emptySub: {
    fontSize: 13,
    color: isDark ? '#64748B' : '#64748B',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.48)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: isDark ? '#1A2130' : '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 22,
    paddingBottom: 36,
    gap: 12,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, alignSelf: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : '#E2E8F0',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: isDark ? '#F8FAFC' : '#0F172A', letterSpacing: -0.3 },
  modalSubtitle: { fontSize: 13, fontWeight: '600', color: isDark ? '#94A3B8' : '#64748B', marginBottom: 4 },
  modalLabel: {
    fontSize: 11, fontWeight: '800', letterSpacing: 0.5,
    color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase',
  },
  modeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  modeChip: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChipActive: {
    backgroundColor: isDark ? 'rgba(16,185,129,0.14)' : '#ECFDF5',
    borderColor: '#059669',
  },
  modeText: { fontSize: 12, fontWeight: '700', color: isDark ? '#94A3B8' : '#64748B' },
  modeTextActive: { color: '#059669' },
  remarksInput: {
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
    color: isDark ? '#F8FAFC' : '#0F172A',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  collectBtn: {
    marginTop: 8,
    backgroundColor: '#059669',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  collectBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  multiBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: isDark ? '#0F172A' : '#111827',
    maxWidth: 848,
    alignSelf: 'center',
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.28,
        shadowRadius: 18,
      },
      android: { elevation: 10 },
    }),
  },
  multiBarCount: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.58)',
    marginBottom: 2,
  },
  multiBarTotal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  multiBarBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  multiBarBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
