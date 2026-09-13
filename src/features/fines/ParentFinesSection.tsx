import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import AppTextInput from '@/src/components/AppTextInput';
import { FineService } from '../../services/fineService';
import type { Fine } from '../../types/fines';
import { DISPUTE_REASONS, FINE_STATUS_LABELS } from '../../types/fines';
import { alertCompat } from '../../utils/crossPlatformAlert';

const fmtINR = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function ParentFinesSection({
  studentId,
  fines,
}: {
  studentId: string;
  fines?: Fine[];
}) {
  const [local, setLocal] = useState<Fine[] | null>(null);
  const [selected, setSelected] = useState<Fine | null>(null);
  const [reasonType, setReasonType] = useState<string>(DISPUTE_REASONS[0]);
  const [message, setMessage] = useState('');

  React.useEffect(() => {
    if (fines) {
      setLocal(fines);
      return;
    }
    FineService.getStudentFines(studentId || 'me')
      .then((r) => setLocal([...(r.active || []), ...(r.history || [])]))
      .catch(() => setLocal([]));
  }, [studentId, fines]);

  const rows = local || [];
  const outstanding = useMemo(
    () => rows.filter((f) => Number(f.outstanding_amount) > 0 && !['CANCELLED', 'REJECTED', 'PAID', 'WAIVED'].includes(f.status)),
    [rows],
  );

  if (local === null) return null;

  return (
    <View style={st.wrap}>
      <Text style={st.title}>Fines & adjustments</Text>
      {outstanding.length === 0 && rows.length === 0 && (
        <Text style={st.empty}>This student currently has no pending fines.</Text>
      )}
      {outstanding.map((fine) => {
        const calc = fine.calculation_details;
        return (
          <View key={fine.id} style={st.card}>
            <Text style={st.cat}>{fine.category_name}</Text>
            <Text style={st.amt}>{fmtINR(Number(fine.outstanding_amount))} <Text style={st.status}>{FINE_STATUS_LABELS[fine.status]}</Text></Text>
            <Text style={st.reason}>{fine.reason}</Text>
            {calc?.formula ? <Text style={st.calc}>Calculation: {calc.formula}</Text> : null}
            <Text style={st.meta}>Issued {fine.created_at ? new Date(fine.created_at).toLocaleDateString('en-IN') : '—'} · {fine.fine_no}</Text>
            {fine.source_type === 'FEE_INVOICE' ? <Text style={st.meta}>Related to a fee invoice</Text> : null}
            {['POSTED', 'PARTIALLY_PAID', 'PARTIALLY_WAIVED'].includes(fine.status) && (
              <Pressable style={st.linkBtn} onPress={() => { setSelected(fine); setMessage(''); }}>
                <Text style={st.link}>Request review</Text>
              </Pressable>
            )}
          </View>
        );
      })}

      <Modal visible={!!selected} transparent animationType="fade">
        <View style={st.backdrop}>
          <View style={st.sheet}>
            <Text style={st.title}>Request a review</Text>
            <Text style={st.reason}>{selected?.fine_no} · {selected?.category_name}</Text>
            {DISPUTE_REASONS.map((r) => (
              <Pressable key={r} onPress={() => setReasonType(r)}>
                <Text style={[st.option, reasonType === r && st.optionOn]}>{r}</Text>
              </Pressable>
            ))}
            <AppTextInput placeholder="Explain briefly" value={message} onChangeText={setMessage} style={st.input} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <Pressable onPress={() => setSelected(null)}><Text style={st.meta}>Cancel</Text></Pressable>
              <Pressable
                onPress={async () => {
                  if (!selected || !message.trim()) return;
                  await FineService.disputeFine(selected.id, {
                    reason_type: reasonType,
                    message: message.trim(),
                    student_id: studentId,
                  });
                  alertCompat('Review submitted', 'The accounts office will review this fine.');
                  setSelected(null);
                  FineService.getStudentFines(studentId || 'me').then((r) => setLocal([...(r.active || []), ...(r.history || [])])).catch(() => {});
                }}
              >
                <Text style={st.link}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { marginTop: 18, marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  empty: { color: '#64748B' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(217,119,6,0.18)' },
  cat: { fontWeight: '800', color: '#92400E' },
  amt: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginTop: 4 },
  status: { fontSize: 13, color: '#B45309' },
  reason: { marginTop: 8, color: '#334155', lineHeight: 20 },
  calc: { marginTop: 4, color: '#0F766E', fontWeight: '600' },
  meta: { marginTop: 6, color: '#64748B', fontSize: 12 },
  linkBtn: { marginTop: 10 },
  link: { color: '#D97706', fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: '#fff', borderRadius: 20, padding: 16 },
  option: { paddingVertical: 8, color: '#334155' },
  optionOn: { fontWeight: '800', color: '#D97706' },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, marginVertical: 10 },
});
