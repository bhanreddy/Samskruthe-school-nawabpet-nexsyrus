import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { admissionService } from '../../services/admissionService';
import { showAlert } from '../CustomAlert';
import type { AdmissionApplication } from '../../types/admission';

const STEPS = [
  { key: 'student', title: 'Student' },
  { key: 'family', title: 'Family' },
  { key: 'address', title: 'Address' },
  { key: 'school', title: 'Previous school' },
  { key: 'logistics', title: 'Needs' },
  { key: 'review', title: 'Review' },
] as const;

type WizardProps = {
  application: AdmissionApplication;
  isDraft: boolean;
  onSaved?: () => void;
  onSubmitted?: () => void;
};

function ToggleRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: '#CBD5E1', true: '#0F766E' }}
      />
    </View>
  );
}

export default function ApplicantApplicationWizard({
  application,
  isDraft,
  onSaved,
  onSubmitted,
}: WizardProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [declared, setDeclared] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setForm({
      student_first_name: application.student_first_name || '',
      student_last_name: application.student_last_name || '',
      dob: application.dob ? String(application.dob).slice(0, 10) : '',
      gender_id: application.gender_id || '',
      father_name: application.father_name || '',
      father_phone: application.father_phone || '',
      father_email: application.father_email || '',
      father_occupation: application.father_occupation || '',
      mother_name: application.mother_name || '',
      mother_phone: application.mother_phone || '',
      mother_email: application.mother_email || '',
      address_line1: application.address_line1 || '',
      city: application.city || '',
      state: application.state || '',
      pincode: application.pincode || '',
      has_previous_school: Boolean(application.has_previous_school),
      previous_school_name: application.previous_school_name || '',
      previous_board: application.previous_board || '',
      previous_class: application.previous_class || '',
      tc_number: application.tc_number || '',
      transport_required: Boolean(application.transport_required),
      pickup_location: application.pickup_location || '',
      hostel_required: Boolean(application.hostel_required),
      sibling_studying_here: Boolean(application.sibling_studying_here),
      sibling_name: application.sibling_name || '',
      sibling_admission_no: application.sibling_admission_no || '',
      medical_conditions: application.medical_conditions || '',
      emergency_contact_name: application.emergency_contact_name || '',
      emergency_contact_phone: application.emergency_contact_phone || '',
    });
  }, [application.id]);

  const patch = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (!isDraft) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      admissionService.updateMyApplication({ [key]: value } as any).catch(() => {});
    }, 1200);
  };

  const saveDraft = async (silent = false) => {
    if (!isDraft) return;
    setSaving(true);
    try {
      await admissionService.updateMyApplication(form as any);
      if (!silent) {
        showAlert({ title: 'Draft Saved', message: 'Your application changes have been saved.', type: 'success' });
      }
      onSaved?.();
    } catch (err: any) {
      if (!silent) {
        showAlert({
          title: 'Save Failed',
          message: err?.response?.data?.error || err?.message || 'Failed to save changes.',
          type: 'error',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const missing = useMemo(() => {
    const gaps: string[] = [];
    if (!String(form.student_first_name || '').trim()) gaps.push('Student first name');
    if (!form.dob) gaps.push('Date of birth');
    if (!String(form.father_name || '').trim() && !String(form.mother_name || '').trim()) gaps.push('Parent name');
    if (!String(form.father_phone || '').trim() && !String(form.mother_phone || '').trim()) gaps.push('Parent phone');
    if (form.has_previous_school && !String(form.previous_school_name || '').trim()) gaps.push('Previous school name');
    if (form.transport_required && !String(form.pickup_location || '').trim()) gaps.push('Pickup location');
    if (form.sibling_studying_here && !String(form.sibling_name || '').trim()) gaps.push('Sibling name');
    return gaps;
  }, [form]);

  const goNext = async () => {
    if (isDraft) await saveDraft(true);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const submit = async () => {
    if (missing.length) {
      showAlert({
        title: 'Incomplete application',
        message: `Please complete: ${missing.join(', ')}`,
        type: 'warning',
      });
      return;
    }
    if (!declared) {
      showAlert({
        title: 'Declaration required',
        message: 'Please confirm that the information provided is accurate.',
        type: 'warning',
      });
      return;
    }
    setSubmitting(true);
    try {
      await admissionService.updateMyApplication(form as any);
      await admissionService.submitMyApplication();
      showAlert({
        title: 'Application Submitted!',
        message: 'The school will review your dossier and update you shortly.',
        type: 'success',
      });
      onSubmitted?.();
    } catch (err: any) {
      showAlert({
        title: 'Submission Incomplete',
        message: err?.response?.data?.error || err?.message || 'Please complete all required fields.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = !isDraft;

  return (
    <View style={styles.card}>
      <View style={styles.stepRow}>
        {STEPS.map((item, idx) => (
          <TouchableOpacity key={item.key} style={styles.stepChip} onPress={() => setStep(idx)}>
            <View style={[styles.stepDot, idx <= step && styles.stepDotActive]}>
              <Text style={styles.stepDotText}>{idx + 1}</Text>
            </View>
            <Text style={[styles.stepChipText, idx === step && styles.stepChipTextActive]} numberOfLines={1}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isDraft ? (
        <View style={styles.draftBadge}><Text style={styles.draftBadgeText}>DRAFT — autosaves as you go</Text></View>
      ) : (
        <View style={styles.lockedBadge}><Text style={styles.lockedBadgeText}>Submitted — contact the school for corrections</Text></View>
      )}

      {step === 0 && (
        <View>
          <Text style={styles.sectionHeading}>Student details</Text>
          <Text style={styles.label}>First name *</Text>
          <TextInput style={[styles.input, disabled && styles.inputDisabled]} editable={!disabled} value={form.student_first_name} onChangeText={(v) => patch('student_first_name', v)} />
          <Text style={styles.label}>Last name</Text>
          <TextInput style={[styles.input, disabled && styles.inputDisabled]} editable={!disabled} value={form.student_last_name} onChangeText={(v) => patch('student_last_name', v)} />
          <Text style={styles.label}>Date of birth (YYYY-MM-DD) *</Text>
          <TextInput style={[styles.input, disabled && styles.inputDisabled]} editable={!disabled} placeholder="YYYY-MM-DD" value={form.dob} onChangeText={(v) => patch('dob', v)} />
        </View>
      )}

      {step === 1 && (
        <View>
          <Text style={styles.sectionHeading}>Parent / guardian</Text>
          <Text style={styles.label}>Father's name *</Text>
          <TextInput style={[styles.input, disabled && styles.inputDisabled]} editable={!disabled} value={form.father_name} onChangeText={(v) => patch('father_name', v)} />
          <Text style={styles.label}>Father's phone *</Text>
          <TextInput style={[styles.input, disabled && styles.inputDisabled]} editable={!disabled} keyboardType="phone-pad" value={form.father_phone} onChangeText={(v) => patch('father_phone', v)} />
          <Text style={styles.label}>Father's email</Text>
          <TextInput style={[styles.input, disabled && styles.inputDisabled]} editable={!disabled} autoCapitalize="none" value={form.father_email} onChangeText={(v) => patch('father_email', v)} />
          <Text style={styles.label}>Mother's name</Text>
          <TextInput style={[styles.input, disabled && styles.inputDisabled]} editable={!disabled} value={form.mother_name} onChangeText={(v) => patch('mother_name', v)} />
          <Text style={styles.label}>Mother's phone</Text>
          <TextInput style={[styles.input, disabled && styles.inputDisabled]} editable={!disabled} keyboardType="phone-pad" value={form.mother_phone} onChangeText={(v) => patch('mother_phone', v)} />
        </View>
      )}

      {step === 2 && (
        <View>
          <Text style={styles.sectionHeading}>Address</Text>
          <Text style={styles.label}>Address line</Text>
          <TextInput style={[styles.input, disabled && styles.inputDisabled]} editable={!disabled} value={form.address_line1} onChangeText={(v) => patch('address_line1', v)} />
          <Text style={styles.label}>City</Text>
          <TextInput style={[styles.input, disabled && styles.inputDisabled]} editable={!disabled} value={form.city} onChangeText={(v) => patch('city', v)} />
          <Text style={styles.label}>State</Text>
          <TextInput style={[styles.input, disabled && styles.inputDisabled]} editable={!disabled} value={form.state} onChangeText={(v) => patch('state', v)} />
          <Text style={styles.label}>PIN code</Text>
          <TextInput style={[styles.input, disabled && styles.inputDisabled]} editable={!disabled} keyboardType="number-pad" value={form.pincode} onChangeText={(v) => patch('pincode', v)} />
        </View>
      )}

      {step === 3 && (
        <View>
          <Text style={styles.sectionHeading}>Previous school</Text>
          <ToggleRow label="Attended another school?" value={Boolean(form.has_previous_school)} disabled={disabled} onChange={(v) => patch('has_previous_school', v)} />
          {form.has_previous_school ? (
            <>
              <Text style={styles.label}>School name *</Text>
              <TextInput style={[styles.input, disabled && styles.inputDisabled]} editable={!disabled} value={form.previous_school_name} onChangeText={(v) => patch('previous_school_name', v)} />
              <Text style={styles.label}>Board</Text>
              <TextInput style={[styles.input, disabled && styles.inputDisabled]} editable={!disabled} value={form.previous_board} onChangeText={(v) => patch('previous_board', v)} />
              <Text style={styles.label}>Last class</Text>
              <TextInput style={[styles.input, disabled && styles.inputDisabled]} editable={!disabled} value={form.previous_class} onChangeText={(v) => patch('previous_class', v)} />
              <Text style={styles.label}>Transfer certificate number</Text>
              <TextInput style={[styles.input, disabled && styles.inputDisabled]} editable={!disabled} value={form.tc_number} onChangeText={(v) => patch('tc_number', v)} />
            </>
          ) : (
            <Text style={styles.hint}>No previous school details are required.</Text>
          )}
        </View>
      )}

      {step === 4 && (
        <View>
          <Text style={styles.sectionHeading}>Transport, hostel and family</Text>
          <ToggleRow label="School transport required?" value={Boolean(form.transport_required)} disabled={disabled} onChange={(v) => patch('transport_required', v)} />
          {form.transport_required ? (
            <>
              <Text style={styles.label}>Pickup area *</Text>
              <TextInput style={[styles.input, disabled && styles.inputDisabled]} editable={!disabled} value={form.pickup_location} onChangeText={(v) => patch('pickup_location', v)} />
            </>
          ) : null}
          <ToggleRow label="Hostel required?" value={Boolean(form.hostel_required)} disabled={disabled} onChange={(v) => patch('hostel_required', v)} />
          <ToggleRow label="Sibling studying here?" value={Boolean(form.sibling_studying_here)} disabled={disabled} onChange={(v) => patch('sibling_studying_here', v)} />
          {form.sibling_studying_here ? (
            <>
              <Text style={styles.label}>Sibling name *</Text>
              <TextInput style={[styles.input, disabled && styles.inputDisabled]} editable={!disabled} value={form.sibling_name} onChangeText={(v) => patch('sibling_name', v)} />
              <Text style={styles.label}>Sibling admission number</Text>
              <TextInput style={[styles.input, disabled && styles.inputDisabled]} editable={!disabled} value={form.sibling_admission_no} onChangeText={(v) => patch('sibling_admission_no', v)} />
            </>
          ) : null}
          <Text style={styles.label}>Emergency contact name</Text>
          <TextInput style={[styles.input, disabled && styles.inputDisabled]} editable={!disabled} value={form.emergency_contact_name} onChangeText={(v) => patch('emergency_contact_name', v)} />
          <Text style={styles.label}>Emergency contact phone</Text>
          <TextInput style={[styles.input, disabled && styles.inputDisabled]} editable={!disabled} keyboardType="phone-pad" value={form.emergency_contact_phone} onChangeText={(v) => patch('emergency_contact_phone', v)} />
          <Text style={styles.label}>Medical notes</Text>
          <TextInput style={[styles.input, { height: 80 }, disabled && styles.inputDisabled]} editable={!disabled} multiline value={form.medical_conditions} onChangeText={(v) => patch('medical_conditions', v)} />
        </View>
      )}

      {step === 5 && (
        <View>
          <Text style={styles.sectionHeading}>Review and declaration</Text>
          {missing.length ? (
            <View style={styles.missingBox}>
              <Text style={styles.missingTitle}>Still missing</Text>
              {missing.map((item) => <Text key={item} style={styles.missingItem}>• {item}</Text>)}
            </View>
          ) : (
            <Text style={styles.hint}>All required fields look complete.</Text>
          )}
          <Text style={styles.reviewLine}>{form.student_first_name} {form.student_last_name} · DOB {form.dob || '—'}</Text>
          <Text style={styles.reviewLine}>Parent: {form.father_name || form.mother_name} · {form.father_phone || form.mother_phone}</Text>
          <Text style={styles.reviewLine}>{form.address_line1 || 'No address'} {form.city || ''}</Text>
          {isDraft ? (
            <ToggleRow label="I confirm the information is true and complete." value={declared} onChange={setDeclared} />
          ) : null}
        </View>
      )}

      <View style={styles.navRow}>
        {step > 0 ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(step - 1)}>
            <Text style={styles.secondaryBtnText}>Back</Text>
          </TouchableOpacity>
        ) : <View />}
        {step < STEPS.length - 1 ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={goNext}>
            <Text style={styles.primaryBtnText}>Next</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </TouchableOpacity>
        ) : isDraft ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Submit to school</Text>}
          </TouchableOpacity>
        ) : null}
      </View>

      {isDraft && step < STEPS.length - 1 ? (
        <TouchableOpacity style={styles.saveLink} onPress={() => saveDraft(false)} disabled={saving}>
          {saving ? <ActivityIndicator color="#0F766E" /> : <Text style={styles.saveLinkText}>Save draft</Text>}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  stepRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  stepChip: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '48%' },
  stepDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: '#0F766E' },
  stepDotText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  stepChipText: { fontSize: 11, color: '#64748B' },
  stepChipTextActive: { color: '#0F766E', fontWeight: '700' },
  draftBadge: { alignSelf: 'flex-start', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
  draftBadgeText: { color: '#047857', fontSize: 11, fontWeight: '700' },
  lockedBadge: { alignSelf: 'flex-start', backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
  lockedBadgeText: { color: '#475569', fontSize: 11, fontWeight: '600' },
  sectionHeading: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#0F172A', backgroundColor: '#FFF' },
  inputDisabled: { backgroundColor: '#F8FAFC', color: '#64748B' },
  hint: { color: '#64748B', fontSize: 13, marginTop: 8 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  missingBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 12 },
  missingTitle: { color: '#991B1B', fontWeight: '700', marginBottom: 4 },
  missingItem: { color: '#B91C1C', fontSize: 13 },
  reviewLine: { color: '#334155', fontSize: 14, marginBottom: 6 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
  primaryBtn: { backgroundColor: '#0F766E', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  primaryBtnText: { color: '#FFF', fontWeight: '700' },
  secondaryBtn: { paddingHorizontal: 12, paddingVertical: 12 },
  secondaryBtnText: { color: '#0F766E', fontWeight: '700' },
  saveLink: { marginTop: 12, alignItems: 'center' },
  saveLinkText: { color: '#0F766E', fontWeight: '600' },
});
