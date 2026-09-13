import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/apiClient';
import * as Haptics from '../../utils/haptics';

interface CampusPolicy {
  campus_name: string;
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
  max_location_age_seconds: number;
  max_accuracy_meters: number;
  grace_period_minutes: number;
  check_in_start_time: string;
  check_in_end_time: string;
  check_out_start_time: string;
  check_out_end_time: string;
  enforcement_mode: 'disabled' | 'pilot' | 'optional' | 'enforced';
}

interface Props {
  visible: boolean;
  isDark: boolean;
  onClose: () => void;
}

export default function CampusGeofenceModal({ visible, isDark, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<CampusPolicy>({
    campus_name: 'Main Campus',
    center_latitude: 17.385044,
    center_longitude: 78.486671,
    radius_meters: 100,
    max_location_age_seconds: 30,
    max_accuracy_meters: 50,
    grace_period_minutes: 15,
    check_in_start_time: '07:00:00',
    check_in_end_time: '11:00:00',
    check_out_start_time: '14:00:00',
    check_out_end_time: '19:00:00',
    enforcement_mode: 'pilot',
  });

  useEffect(() => {
    if (visible) {
      loadPolicy();
    }
  }, [visible]);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      const res = await api.get<CampusPolicy>('/attendance/v2/admin/policy');
      if (res) {
        setPolicy(res);
      }
    } catch (err) {
      console.warn('Failed to fetch campus policy:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/attendance/v2/admin/policy', policy);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Policy Saved', 'Campus geofence and attendance rules updated.');
      onClose();
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not save policy.');
    } finally {
      setSaving(false);
    }
  };

  const cardBg = isDark ? '#161929' : '#FFFFFF';
  const borderClr = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
  const textSecondary = isDark ? 'rgba(255,255,255,0.6)' : '#64748B';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderClr }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: textPrimary }]}>Campus Geofence & Rules</Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>
                Configure attendance boundary coordinates and rollout enforcement
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color="#6366F1" />
            </View>
          ) : (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              {/* Rollout Mode Segment */}
              <Text style={[styles.fieldLabel, { color: textPrimary }]}>Rollout Mode</Text>
              <View style={styles.rolloutRow}>
                {(['disabled', 'pilot', 'optional', 'enforced'] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setPolicy({ ...policy, enforcement_mode: m })}
                    style={[
                      styles.rolloutChip,
                      policy.enforcement_mode === m && styles.rolloutChipActive,
                      { borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.rolloutText,
                        { color: policy.enforcement_mode === m ? '#6366F1' : textSecondary },
                      ]}
                    >
                      {m.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: textPrimary }]}>Campus Name</Text>
              <TextInput
                style={[styles.input, { color: textPrimary, borderColor: borderClr }]}
                value={policy.campus_name}
                onChangeText={(v) => setPolicy({ ...policy, campus_name: v })}
              />

              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={[styles.fieldLabel, { color: textPrimary }]}>Latitude</Text>
                  <TextInput
                    style={[styles.input, { color: textPrimary, borderColor: borderClr }]}
                    keyboardType="numeric"
                    value={String(policy.center_latitude || '')}
                    onChangeText={(v) => setPolicy({ ...policy, center_latitude: parseFloat(v) || 0 })}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={[styles.fieldLabel, { color: textPrimary }]}>Longitude</Text>
                  <TextInput
                    style={[styles.input, { color: textPrimary, borderColor: borderClr }]}
                    keyboardType="numeric"
                    value={String(policy.center_longitude || '')}
                    onChangeText={(v) => setPolicy({ ...policy, center_longitude: parseFloat(v) || 0 })}
                  />
                </View>
              </View>

              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={[styles.fieldLabel, { color: textPrimary }]}>Geofence Radius (metres)</Text>
                  <TextInput
                    style={[styles.input, { color: textPrimary, borderColor: borderClr }]}
                    keyboardType="numeric"
                    value={String(policy.radius_meters || '')}
                    onChangeText={(v) => setPolicy({ ...policy, radius_meters: parseInt(v, 10) || 100 })}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={[styles.fieldLabel, { color: textPrimary }]}>Max Accuracy (metres)</Text>
                  <TextInput
                    style={[styles.input, { color: textPrimary, borderColor: borderClr }]}
                    keyboardType="numeric"
                    value={String(policy.max_accuracy_meters || '')}
                    onChangeText={(v) => setPolicy({ ...policy, max_accuracy_meters: parseInt(v, 10) || 50 })}
                  />
                </View>
              </View>

              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={[styles.fieldLabel, { color: textPrimary }]}>Check-In Start</Text>
                  <TextInput
                    style={[styles.input, { color: textPrimary, borderColor: borderClr }]}
                    value={policy.check_in_start_time}
                    placeholder="07:30"
                    onChangeText={(v) => setPolicy({ ...policy, check_in_start_time: v })}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={[styles.fieldLabel, { color: textPrimary }]}>Check-In End</Text>
                  <TextInput
                    style={[styles.input, { color: textPrimary, borderColor: borderClr }]}
                    value={policy.check_in_end_time}
                    placeholder="10:00"
                    onChangeText={(v) => setPolicy({ ...policy, check_in_end_time: v })}
                  />
                </View>
              </View>

              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={[styles.fieldLabel, { color: textPrimary }]}>Check-Out Start</Text>
                  <TextInput
                    style={[styles.input, { color: textPrimary, borderColor: borderClr }]}
                    value={policy.check_out_start_time}
                    placeholder="15:30"
                    onChangeText={(v) => setPolicy({ ...policy, check_out_start_time: v })}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={[styles.fieldLabel, { color: textPrimary }]}>Check-Out End</Text>
                  <TextInput
                    style={[styles.input, { color: textPrimary, borderColor: borderClr }]}
                    value={policy.check_out_end_time}
                    placeholder="19:00"
                    onChangeText={(v) => setPolicy({ ...policy, check_out_end_time: v })}
                  />
                </View>
              </View>

              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={[styles.fieldLabel, { color: textPrimary }]}>Grace Period (minutes)</Text>
                  <TextInput
                    style={[styles.input, { color: textPrimary, borderColor: borderClr }]}
                    keyboardType="numeric"
                    value={String(policy.grace_period_minutes ?? '')}
                    onChangeText={(v) => setPolicy({ ...policy, grace_period_minutes: parseInt(v, 10) || 0 })}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={[styles.fieldLabel, { color: textPrimary }]}>Max Location Age (seconds)</Text>
                  <TextInput
                    style={[styles.input, { color: textPrimary, borderColor: borderClr }]}
                    keyboardType="numeric"
                    value={String(policy.max_location_age_seconds ?? '')}
                    onChangeText={(v) => setPolicy({ ...policy, max_location_age_seconds: parseInt(v, 10) || 0 })}
                  />
                </View>
              </View>

              <View style={styles.noteBox}>
                <Ionicons name="information-circle" size={16} color="#6366F1" style={{ marginRight: 6 }} />
                <Text style={[styles.noteText, { color: textSecondary }]}>
                  Server calculates the Haversine distance and checks uncertainty: distance + accuracy must be within the geofence radius.
                </Text>
              </View>
            </ScrollView>
          )}

          <View style={[styles.footer, { borderTopColor: borderClr }]}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={{ color: textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={saving}
              onPress={handleSave}
              style={[styles.saveBtn, { backgroundColor: '#6366F1' }]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Save Geofence Rules</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.15)',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  loaderBox: {
    padding: 50,
    alignItems: 'center',
  },
  body: {
    padding: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  rolloutRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  rolloutChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  rolloutChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderColor: '#6366F1',
  },
  rolloutText: {
    fontSize: 11,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
    fontSize: 14,
    marginBottom: 14,
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    marginTop: 4,
    marginBottom: 16,
  },
  noteText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelBtn: {
    padding: 10,
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
});
