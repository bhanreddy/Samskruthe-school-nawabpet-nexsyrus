import React, { useCallback, useEffect, useState } from 'react';
import AppTextInput from '@/src/components/AppTextInput';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import AdminHeader from '../../components/AdminHeader';
import { useAccountsWebChrome } from '../../contexts/AccountsWebChromeContext';
import LogoLoader from '../../components/LogoLoader';
import { FineService, type FineDetailResponse } from '../../services/fineService';
import { alertCompat } from '../../utils/crossPlatformAlert';
import { usePermissions } from '../../hooks/usePermissions';
import { FINE_STATUS_LABELS, WAIVER_REASONS } from '../../types/fines';
import { generateUUID } from '../../../app/accounts/fees/collect';

const fmtINR = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function FineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shellActive, openMobileNav } = useAccountsWebChrome();
  const { hasAnyPermission } = usePermissions();
  const [fine, setFine] = useState<FineDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | 'waive' | 'pay' | 'cancel' | 'approve' | 'reject'>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState<string>(WAIVER_REASONS[0]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const data = await FineService.getFineById(String(id));
    setFine(data);
    setAmount(String(data.outstanding_amount || ''));
  }, [id]);

  useEffect(() => {
    load().catch(() => {}).finally(() => setLoading(false));
  }, [load]);

  const canApprove = hasAnyPermission(['fine.approve', 'approvals.manage']);
  const canWaive = hasAnyPermission(['fine.waive', 'fees.manage']);
  const canCollect = hasAnyPermission(['fine.collect', 'fees.collect']);
  const canCancel = hasAnyPermission(['fine.cancel', 'fine.create', 'fees.manage']);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      setModal(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading || !fine) {
    return (
      <View style={st.root}>
        {!shellActive && <AdminHeader title="Fine details" showBackButton />}
        <View style={st.center}><LogoLoader size={48} /></View>
      </View>
    );
  }

  const calc = fine.calculation_details;

  return (
    <View style={st.root}>
        {!shellActive && (
        <AdminHeader title={fine.fine_no} showBackButton showMenuButton onMenuPress={openMobileNav} />
      )}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={st.h1}>{fine.student_name}</Text>
        <Text style={st.meta}>{fine.admission_no} · {fine.class_name} {fine.section_name}</Text>
        <Text style={st.status}>{FINE_STATUS_LABELS[fine.status] || fine.status}</Text>

        <View style={st.card}>
          <Row label="Category" value={fine.category_name || '—'} />
          <Row label="Policy" value={fine.policy_name || '—'} />
          <Row label="Original" value={fmtINR(Number(fine.original_amount))} />
          <Row label="Adjustment" value={fmtINR(Number(fine.adjustment_amount || 0))} />
          <Row label="Waived" value={fmtINR(Number(fine.waived_amount))} />
          <Row label="Paid" value={fmtINR(Number(fine.paid_amount))} />
          <Row label="Outstanding" value={fmtINR(Number(fine.outstanding_amount))} />
          <Row label="Source" value={`${fine.source_type || 'MANUAL'}${fine.source_id ? ` · ${fine.source_id}` : ''}`} />
        </View>

        <Text style={st.h2}>Reason</Text>
        <Text style={st.body}>{fine.reason}</Text>
        {calc?.formula ? <Text style={st.meta}>Calculation: {calc.formula}</Text> : null}
        {fine.internal_note ? <Text style={st.note}>Internal: {fine.internal_note}</Text> : null}

        <View style={st.actions}>
          {canApprove && fine.status === 'PENDING_APPROVAL' && (
            <>
              <Btn label="Approve" onPress={() => setModal('approve')} />
              <Btn label="Reject" ghost onPress={() => setModal('reject')} />
            </>
          )}
          {canCollect && ['POSTED', 'PARTIALLY_PAID', 'PARTIALLY_WAIVED', 'DISPUTED'].includes(fine.status) && Number(fine.outstanding_amount) > 0 && (
            <Btn label="Collect payment" onPress={() => setModal('pay')} />
          )}
          {canWaive && ['POSTED', 'PARTIALLY_PAID', 'PARTIALLY_WAIVED', 'DISPUTED'].includes(fine.status) && Number(fine.outstanding_amount) > 0 && (
            <Btn label="Waive" ghost onPress={() => setModal('waive')} />
          )}
          {canCancel && !['PAID', 'CANCELLED', 'REJECTED'].includes(fine.status) && Number(fine.paid_amount) === 0 && (
            <Btn label="Cancel fine" ghost onPress={() => setModal('cancel')} />
          )}
        </View>

        <Text style={st.h2}>Payments</Text>
        {(fine.payments || []).length === 0 && <Text style={st.meta}>No payments yet.</Text>}
        {(fine.payments || []).map((p) => (
          <Text key={p.id} style={st.body}>{fmtINR(Number(p.amount))} · {p.receipt_no} · {p.payment_method}</Text>
        ))}

        <Text style={st.h2}>Waivers</Text>
        {(fine.waivers || []).length === 0 && <Text style={st.meta}>No waivers.</Text>}
        {(fine.waivers || []).map((w) => (
          <Text key={w.id} style={st.body}>{fmtINR(Number(w.amount))} · {w.reason}</Text>
        ))}

        <Text style={st.h2}>Disputes</Text>
        {(fine.disputes || []).length === 0 && <Text style={st.meta}>No review requests.</Text>}
        {(fine.disputes || []).map((d) => (
          <Text key={d.id} style={st.body}>{d.status} · {d.reason_type || d.reason}</Text>
        ))}

        <Text style={st.h2}>Audit trail</Text>
        {(fine.audit_logs || []).map((a) => (
          <Text key={a.id} style={st.meta}>{a.action} · {a.user_name || 'System'} · {new Date(a.created_at).toLocaleString('en-IN')}</Text>
        ))}
      </ScrollView>

      <Modal visible={!!modal} transparent animationType="fade">
        <View style={st.backdrop}>
          <View style={st.sheet}>
            <Text style={st.h1}>
              {modal === 'waive' ? 'Confirm waiver' : modal === 'pay' ? 'Collect payment' : modal === 'cancel' ? 'Cancel this fine?' : modal === 'approve' ? 'Approve request' : 'Reject request'}
            </Text>
            {(modal === 'pay' || modal === 'waive' || modal === 'approve') && (
              <AppTextInput value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="Amount" style={st.input} />
            )}
            {modal !== 'pay' && (
              <AppTextInput value={reason} onChangeText={setReason} placeholder="Reason" style={st.input} />
            )}
            <Text style={st.meta}>This action is permanently recorded on the student ledger.</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
              <Pressable onPress={() => setModal(null)}><Text style={st.link}>Back</Text></Pressable>
              <Pressable
                style={st.btn}
                disabled={busy}
                onPress={() => run(async () => {
                  if (modal === 'pay') {
                    await FineService.recordPayment(fine.id, { amount: Number(amount), payment_method: 'cash', transaction_ref: generateUUID() });
                    alertCompat('Payment recorded', 'A receipt has been generated.');
                  } else if (modal === 'waive') {
                    await FineService.waiveFine(fine.id, { amount: Number(amount), reason });
                  } else if (modal === 'cancel') {
                    await FineService.cancelFine(fine.id, reason);
                  } else if (modal === 'approve') {
                    await FineService.approveFine(fine.id, { approved_amount: Number(amount) || undefined, review_note: reason });
                  } else if (modal === 'reject') {
                    await FineService.rejectFine(fine.id, reason);
                  }
                })}
              >
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.btnText}>Confirm</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={st.kv}>
      <Text style={st.k}>{label}</Text>
      <Text style={st.v}>{value}</Text>
    </View>
  );
}

function Btn({ label, onPress, ghost }: { label: string; onPress: () => void; ghost?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[st.btn, ghost && st.btnGhost]}>
      <Text style={[st.btnText, ghost && { color: '#D97706' }]}>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  h2: { marginTop: 18, marginBottom: 6, fontWeight: '800', fontSize: 16 },
  meta: { color: '#64748B', marginTop: 4 },
  status: { marginTop: 8, fontWeight: '800', color: '#B45309' },
  body: { color: '#0F172A', lineHeight: 20 },
  note: { marginTop: 8, color: '#7C2D12', fontStyle: 'italic' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginTop: 14 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  k: { color: '#64748B', fontWeight: '600' },
  v: { fontWeight: '800', color: '#0F172A' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  btn: { backgroundColor: '#D97706', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  btnGhost: { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FDBA74' },
  btnText: { color: '#fff', fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: '#fff', borderRadius: 20, padding: 16 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, marginTop: 10 },
  link: { color: '#64748B', fontWeight: '700', padding: 10 },
});
