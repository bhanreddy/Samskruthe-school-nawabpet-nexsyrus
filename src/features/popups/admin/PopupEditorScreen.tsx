import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../../hooks/useTheme';
import { ClassService, type ClassInfo, type Section } from '../../../services/classService';
import { alertCompat } from '../../../utils/crossPlatformAlert';
import { popupApi } from '../popupApi';
import { PopupRenderer } from '../components/PopupRenderer';
import { EMPTY_TARGETING, type EligiblePopup, type PopupButton, type PopupTargeting, type TargetRoleGroup } from '../types';

const CATEGORIES = ['INFORMATION','WARNING','IMPORTANT','EMERGENCY','FEATURE_UPDATE','APP_UPDATE','PAYMENT','ATTENDANCE','EXAM','TRANSPORT','DOCUMENT','MAINTENANCE','CUSTOM'];
const PRIORITIES = ['LOW','NORMAL','HIGH','CRITICAL'];
const LAYOUTS = ['COMPACT','STANDARD','RICH','CRITICAL','UPDATE'];
const FREQUENCIES = ['SHOW_ONCE','UNTIL_ACKNOWLEDGED','EVERY_LOGIN','ONCE_PER_DAY','UNTIL_ACTION_COMPLETED'];
const ROLES: TargetRoleGroup[] = ['everyone','management','staff','parent','accounts','driver'];
const ACTIONS = ['NONE','DISMISS','ACKNOWLEDGE','OPEN_MODULE','UPDATE_APP','EXTERNAL_URL','OPEN_SUPPORT'];
const MODULES = ['OPEN_FEES','OPEN_ATTENDANCE','OPEN_RESULTS','OPEN_HOMEWORK','OPEN_TIMETABLE','OPEN_TRANSPORT','OPEN_NOTICES','OPEN_PROFILE','OPEN_REPORTS','OPEN_COLLECTION_REPORT','OPEN_RECONCILIATION','OPEN_ATTENDANCE_ANALYTICS','VIEW_ROUTE'];
const PREVIEW_ROLES = ['management','staff','parent','accounts','driver'] as const;

const emptyButton = (order: number): PopupButton => ({
  id: `btn_${order}`,
  label: order === 0 ? 'Continue' : 'Later',
  actionType: order === 0 ? 'OPEN_MODULE' : 'DISMISS',
  target: order === 0 ? 'OPEN_FEES' : null,
  parameters: {},
  visualStyle: order === 0 ? 'primary' : 'secondary',
  order,
});

export default function PopupEditorScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { id, preview } = useLocalSearchParams<{ id?: string; preview?: string }>();
  const [title, setTitle] = useState('');
  const [heading, setHeading] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('INFORMATION');
  const [priority, setPriority] = useState('HIGH');
  const [layout, setLayout] = useState('STANDARD');
  const [frequency, setFrequency] = useState('SHOW_ONCE');
  const [startAt, setStartAt] = useState(new Date().toISOString().slice(0, 16));
  const [endAt, setEndAt] = useState('');
  const [allowDismiss, setAllowDismiss] = useState(true);
  const [requireAck, setRequireAck] = useState(false);
  const [sendPush, setSendPush] = useState(false);
  const [feePending, setFeePending] = useState(false);
  const [targeting, setTargeting] = useState<PopupTargeting>(EMPTY_TARGETING);
  const [buttons, setButtons] = useState<PopupButton[]>([emptyButton(0)]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [previewRole, setPreviewRole] = useState<(typeof PREVIEW_ROLES)[number]>('parent');
  const [showPreview, setShowPreview] = useState(preview === '1');
  const [saving, setSaving] = useState(false);
  const [popupId, setPopupId] = useState<string | null>(typeof id === 'string' ? id : null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    ClassService.getClasses().then(setClasses).catch(() => {});
    ClassService.getSections().then(setSections).catch(() => {});
  }, []);

  useEffect(() => {
    if (!popupId) return;
    popupApi.getAdmin(popupId).then(({ item }) => {
      setTitle(item.title);
      setHeading(item.heading || '');
      setMessage(item.message);
      setCategory(item.category);
      setPriority(item.priority);
      setLayout(item.layout_type);
      setFrequency(item.frequency);
      setStartAt(item.start_at?.slice(0, 16) || startAt);
      setEndAt(item.end_at?.slice(0, 16) || '');
      setAllowDismiss(item.allow_dismiss);
      setRequireAck(item.require_acknowledgement);
      setSendPush(Boolean(item.send_push));
      setFeePending(item.completion_condition?.type === 'FEE_PENDING');
      setTargeting({ ...EMPTY_TARGETING, ...item.targeting });
      setButtons(item.buttons?.length ? item.buttons : [emptyButton(0)]);
      setImageUri(item.image_url || null);
    }).catch((error: any) => alertCompat('Could not load popup', error?.message || 'Try again'));
  }, [popupId]);

  const refreshEstimate = useCallback(async () => {
    try {
      const result = await popupApi.estimate(targeting);
      setEstimate(result.estimated_recipients);
    } catch {
      setEstimate(null);
    }
  }, [targeting]);

  useEffect(() => { void refreshEstimate(); }, [refreshEstimate]);

  const payload = useMemo(() => ({
    title,
    heading,
    message,
    category,
    priority,
    layout_type: layout,
    frequency,
    start_at: startAt ? new Date(startAt).toISOString() : new Date().toISOString(),
    end_at: endAt ? new Date(endAt).toISOString() : null,
    allow_dismiss: allowDismiss,
    require_acknowledgement: requireAck || frequency === 'UNTIL_ACKNOWLEDGED',
    send_push: sendPush,
    targeting,
    buttons,
    completion_condition: { type: feePending ? 'FEE_PENDING' : 'NONE' },
    update_mode: category === 'APP_UPDATE' ? 'OPTIONAL_UPDATE' : 'NONE',
  }), [title, heading, message, category, priority, layout, frequency, startAt, endAt, allowDismiss, requireAck, sendPush, targeting, buttons, feePending]);

  const previewPopup: EligiblePopup = {
    id: popupId || 'preview',
    title: title || 'Popup title',
    heading,
    message: message || 'Message preview',
    category: category as EligiblePopup['category'],
    priority: priority as EligiblePopup['priority'],
    layout_type: layout as EligiblePopup['layout_type'],
    image_url: imageUri,
    frequency: frequency as EligiblePopup['frequency'],
    start_at: payload.start_at,
    end_at: payload.end_at,
    allow_dismiss: allowDismiss,
    require_acknowledgement: payload.require_acknowledgement,
    update_mode: payload.update_mode as EligiblePopup['update_mode'],
    buttons,
  };

  const save = async (publish = false) => {
    if (!title.trim() || !message.trim()) {
      alertCompat('Missing details', 'Title and message are required.');
      return;
    }
    setSaving(true);
    try {
      const result = popupId
        ? await popupApi.update(popupId, payload)
        : await popupApi.create(payload);
      const savedId = result.item.id;
      setPopupId(savedId);
      if (imageUri && imageUri.startsWith('file')) {
        await popupApi.uploadImage(savedId, imageUri).catch(() => {});
      }
      if (publish) await popupApi.publish(savedId);
      alertCompat(publish ? 'Published' : 'Saved', publish ? 'The popup is now live for the target audience.' : 'Draft saved.');
      if (publish) router.replace('/admin/popup-manager' as any);
    } catch (error: any) {
      alertCompat('Could not save popup', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const toggleRole = (role: TargetRoleGroup) => {
    setTargeting((prev) => {
      if (role === 'everyone') return { ...prev, everyone: !prev.everyone, roles: !prev.everyone ? ['everyone'] : [] };
      const roles = prev.roles.includes(role) ? prev.roles.filter((r) => r !== role) : [...prev.roles.filter((r) => r !== 'everyone'), role];
      return { ...prev, everyone: false, roles };
    });
  };

  const toggleId = (key: 'class_ids' | 'section_ids', value: string) => {
    setTargeting((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((id) => id !== value) : [...prev[key], value],
    }));
  };

  const styles = useMemo(() => createStyles(isDark, theme.colors), [isDark, theme.colors]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.form}>
        <Field label="Title" value={title} onChange={setTitle} />
        <Field label="Short heading" value={heading} onChange={setHeading} />
        <Field label="Message" value={message} onChange={setMessage} multiline />

        <Label>Category</Label>
        <ChipRow values={CATEGORIES} selected={category} onSelect={setCategory} />
        <Label>Priority</Label>
        <ChipRow values={PRIORITIES} selected={priority} onSelect={setPriority} />
        <Label>Layout</Label>
        <ChipRow values={LAYOUTS} selected={layout} onSelect={setLayout} />
        <Label>Frequency</Label>
        <ChipRow values={FREQUENCIES} selected={frequency} onSelect={setFrequency} />

        <Field label="Start (local)" value={startAt} onChange={setStartAt} />
        <Field label="End (optional)" value={endAt} onChange={setEndAt} />

        <RowSwitch label="Allow dismiss" value={allowDismiss} onValueChange={setAllowDismiss} />
        <RowSwitch label="Require acknowledgement" value={requireAck} onValueChange={setRequireAck} />
        <RowSwitch label="Also send push notification" value={sendPush} onValueChange={setSendPush} />
        <RowSwitch label="Hide when fees are paid" value={feePending} onValueChange={setFeePending} />

        <Label>Target roles</Label>
        <ChipRow values={ROLES} selected={targeting.everyone ? 'everyone' : ''} selectedMany={targeting.roles} onSelect={toggleRole} />
        <Label>Classes</Label>
        <ChipRow values={classes.map((c) => c.name)} selectedMany={classes.filter((c) => targeting.class_ids.includes(c.id)).map((c) => c.name)} onSelect={(name) => {
          const match = classes.find((c) => c.name === name);
          if (match) toggleId('class_ids', match.id);
        }} />
        <Label>Sections</Label>
        <ChipRow values={sections.map((s) => s.name)} selectedMany={sections.filter((s) => targeting.section_ids.includes(s.id)).map((s) => s.name)} onSelect={(name) => {
          const match = sections.find((s) => s.name === name);
          if (match) toggleId('section_ids', match.id);
        }} />
        <Text style={styles.estimate}>Estimated recipients: {estimate ?? '—'}</Text>

        <Label>Buttons</Label>
        {buttons.map((button, index) => (
          <View key={button.id} style={styles.buttonCard}>
            <Field label="Label" value={button.label} onChange={(label) => setButtons((prev) => prev.map((b, i) => i === index ? { ...b, label } : b))} />
            <ChipRow values={ACTIONS} selected={button.actionType} onSelect={(actionType) => setButtons((prev) => prev.map((b, i) => i === index ? { ...b, actionType: actionType as PopupButton['actionType'] } : b))} />
            {button.actionType === 'OPEN_MODULE' ? (
              <ChipRow values={MODULES} selected={button.target || ''} onSelect={(target) => setButtons((prev) => prev.map((b, i) => i === index ? { ...b, target } : b))} />
            ) : null}
            {button.actionType === 'EXTERNAL_URL' ? (
              <Field label="HTTPS URL" value={button.target || ''} onChange={(target) => setButtons((prev) => prev.map((b, i) => i === index ? { ...b, target } : b))} />
            ) : null}
          </View>
        ))}
        {buttons.length < 2 ? (
          <Pressable onPress={() => setButtons((prev) => [...prev, emptyButton(prev.length)])}><Text style={styles.link}>Add second button</Text></Pressable>
        ) : (
          <Pressable onPress={() => setButtons((prev) => prev.slice(0, 1))}><Text style={styles.link}>Remove second button</Text></Pressable>
        )}

        <Pressable onPress={pickImage} style={styles.secondaryBtn}><Text style={styles.secondaryText}>{imageUri ? 'Change image' : 'Add image / banner'}</Text></Pressable>

        <Label>Preview as</Label>
        <ChipRow values={[...PREVIEW_ROLES]} selected={previewRole} onSelect={(v) => { setPreviewRole(v as any); setShowPreview(true); }} />

        <Pressable disabled={saving} onPress={() => save(false)} style={styles.secondaryBtn}><Text style={styles.secondaryText}>Save draft</Text></Pressable>
        <Pressable disabled={saving} onPress={() => save(true)} style={styles.primaryBtn}><Text style={styles.primaryText}>{saving ? 'Saving…' : 'Save & publish'}</Text></Pressable>
        {popupId ? (
          <Pressable onPress={() => popupApi.testSend(popupId).then(() => alertCompat('Test queued', 'Open the app home screen to see it.')).catch((e: any) => alertCompat('Test failed', e?.message))}><Text style={styles.link}>Send test to me</Text></Pressable>
        ) : null}
      </ScrollView>
      {showPreview ? (
        <PopupRenderer
          popup={previewPopup}
          onButton={() => setShowPreview(false)}
          onDismiss={() => setShowPreview(false)}
        />
      ) : null}
    </View>
  );
}

function Field({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  const { theme, isDark } = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        style={{
          minHeight: multiline ? 90 : 44,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: theme.colors.card,
          color: theme.colors.textStrong,
          borderWidth: 1,
          borderColor: theme.colors.border,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}

function Label({ children }: { children: string }) {
  const { theme } = useTheme();
  return <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 8, marginTop: 8 }}>{children}</Text>;
}

function ChipRow({ values, selected, selectedMany, onSelect }: { values: string[]; selected?: string; selectedMany?: string[]; onSelect: (v: string) => void }) {
  const { theme, isDark } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
      {values.map((value) => {
        const on = selected === value || selectedMany?.includes(value);
        return (
          <Pressable
            key={value}
            onPress={() => onSelect(value)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: on ? theme.colors.primary : (isDark ? '#1E293B' : '#EEF2FF'),
            }}
          >
            <Text style={{ color: on ? '#FFF' : theme.colors.textMuted, fontSize: 11, fontWeight: '700' }}>{value.replace(/_/g, ' ')}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function RowSwitch({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <Text style={{ color: theme.colors.textStrong, fontWeight: '600' }}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function createStyles(isDark: boolean, colors: any) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    form: { padding: 16, paddingBottom: 48 },
    estimate: { color: colors.textMuted, fontWeight: '700', marginBottom: 12 },
    buttonCard: { backgroundColor: colors.card, borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    link: { color: colors.primary, fontWeight: '700', marginBottom: 12 },
    primaryBtn: { backgroundColor: colors.primary, borderRadius: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    primaryText: { color: '#FFF', fontWeight: '700' },
    secondaryBtn: { borderRadius: 14, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#1E293B' : '#EEF2FF', marginBottom: 8 },
    secondaryText: { color: colors.primary, fontWeight: '700' },
  });
}
