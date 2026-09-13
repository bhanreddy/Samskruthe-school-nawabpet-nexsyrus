import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { alertCompat } from '../../utils/crossPlatformAlert';
import { getMediaUrl } from '../../utils/media';
import {
  schoolHeroSlidesService,
  type HeroSlideItem,
} from '../../services/schoolHeroSlidesService';
import {
  celebrationSettingsService,
} from '../../services/celebrationSettingsService';
import type {
  SchoolCelebrationSettings,
  CelebrationSlideItem,
} from '../../services/celebrationTypes';
import CelebrationSlideCard from '../../components/hero-slides/CelebrationSlideCard';

type PickedPhoto = ImagePicker.ImagePickerAsset;

const DEFAULT_SETTINGS: SchoolCelebrationSettings = {
  is_enabled: true,
  student_birthday_enabled: true,
  staff_birthday_enabled: true,
  birthday_music_enabled: true,
  student_template: 'Happy Birthday, {{first_name}}! 🎉\nWishing you joy, success, and a wonderful year ahead.',
  staff_template: 'Celebrating {{full_name}}! 🎂\nHave a fantastic birthday from everyone at {{school_name}}!',
  student_visibility: 'class',
  staff_visibility: 'staff',
  show_student_photo: true,
  show_staff_photo: true,
  show_class: true,
  show_section: true,
  show_staff_designation: true,
};

export default function HeroSlidesManager() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Tab state
  const [activeTab, setActiveTab] = useState<'slides' | 'celebrations'>('slides');

  // Slides state
  const [items, setItems] = useState<HeroSlideItem[]>([]);
  const [selected, setSelected] = useState<PickedPhoto[]>([]);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);

  // Celebration settings state
  const [settings, setSettings] = useState<SchoolCelebrationSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [managedSlides, celebSettings] = await Promise.all([
        schoolHeroSlidesService.listManaged(),
        celebrationSettingsService.getSettings().catch(() => DEFAULT_SETTINGS),
      ]);
      setItems(managedSlides);
      setSettings(celebSettings || DEFAULT_SETTINGS);
      setSettingsDirty(false);
    } catch (error: any) {
      alertCompat('Could not load data', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const choosePhotos = async () => {
    if (uploading) return;
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        alertCompat('Photos permission needed', 'Allow photo library access to add home banners.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.95,
      allowsMultipleSelection: true,
      selectionLimit: 6,
    });
    if (!result.canceled && result.assets?.length) setSelected(result.assets);
  };

  const uploadSelected = async () => {
    if (!selected.length || uploading) return;
    setUploading(true);
    const uploaded: HeroSlideItem[] = [];
    try {
      for (const asset of selected) {
        uploaded.push(await schoolHeroSlidesService.upload({
          uri: asset.uri,
          fileName: asset.fileName,
          mimeType: asset.mimeType,
          title,
          caption,
        }));
      }
      setItems((current) => [...current, ...uploaded]);
      setSelected([]);
      setTitle('');
      setCaption('');
      alertCompat(
        uploaded.length === 1 ? 'Slide published' : 'Slides published',
        'Students and staff can now swipe these banners on home.',
      );
    } catch (error: any) {
      if (uploaded.length) setItems((current) => [...current, ...uploaded]);
      alertCompat('Upload stopped', error?.message || 'Please try the remaining images again.');
    } finally {
      setUploading(false);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const next = items.slice();
    const [row] = next.splice(index, 1);
    next.splice(nextIndex, 0, row);
    setItems(next);
    try {
      setItems(await schoolHeroSlidesService.reorder(next.map((item) => item.id)));
    } catch (error: any) {
      await load(true);
      alertCompat('Could not reorder slides', error?.message || 'Please try again.');
    }
  };

  const toggleActive = async (item: HeroSlideItem) => {
    setWorkingId(item.id);
    try {
      const updated = await schoolHeroSlidesService.update(item.id, { is_active: !item.is_active });
      setItems((current) => current.map((row) => (row.id === item.id ? updated : row)));
    } catch (error: any) {
      alertCompat('Could not update slide', error?.message || 'Please try again.');
    } finally {
      setWorkingId(null);
    }
  };

  const confirmDelete = (item: HeroSlideItem) => {
    if (workingId) return;
    alertCompat(
      'Remove this slide?',
      'It will disappear from student and staff home.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setWorkingId(item.id);
            try {
              await schoolHeroSlidesService.remove(item.id);
              setItems((current) => current.filter((row) => row.id !== item.id));
            } catch (error: any) {
              alertCompat('Could not remove slide', error?.message || 'Please try again.');
            } finally {
              setWorkingId(null);
            }
          },
        },
      ],
    );
  };

  const handleUpdateSetting = <K extends keyof SchoolCelebrationSettings>(key: K, value: SchoolCelebrationSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSettingsDirty(true);
  };

  const saveCelebrationSettings = async () => {
    setSavingSettings(true);
    try {
      const updated = await celebrationSettingsService.updateSettings(settings);
      setSettings(updated);
      setSettingsDirty(false);
      alertCompat('Settings saved', 'Birthday celebrations configuration updated for the school.');
    } catch (err: any) {
      alertCompat('Failed to save', err?.message || 'Could not save celebration settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Helper placeholder replacement for live preview
  const studentPreviewMessage = useMemo(() => {
    const raw = settings.student_template || DEFAULT_SETTINGS.student_template;
    return raw
      .replace(/\{\{\s*first_name\s*\}\}/gi, 'Aarav')
      .replace(/\{\{\s*full_name\s*\}\}/gi, 'Aarav Reddy')
      .replace(/\{\{\s*class\s*\}\}/gi, settings.show_class ? 'VII' : '')
      .replace(/\{\{\s*section\s*\}\}/gi, settings.show_section ? 'A' : '')
      .replace(/\{\{\s*school_name\s*\}\}/gi, 'Greenwood High');
  }, [settings]);

  const staffPreviewMessage = useMemo(() => {
    const raw = settings.staff_template || DEFAULT_SETTINGS.staff_template;
    return raw
      .replace(/\{\{\s*first_name\s*\}\}/gi, 'Kavitha')
      .replace(/\{\{\s*full_name\s*\}\}/gi, 'Mrs. Kavitha')
      .replace(/\{\{\s*designation\s*\}\}/gi, settings.show_staff_designation ? 'Mathematics Teacher' : '')
      .replace(/\{\{\s*school_name\s*\}\}/gi, 'Greenwood High');
  }, [settings]);

  const dummyStudentSlide: CelebrationSlideItem = {
    id: 'preview_student',
    slide_type: 'CELEBRATION',
    celebration_type: 'BIRTHDAY',
    priority: 70,
    title: 'Happy Birthday 🎉',
    message: studentPreviewMessage,
    person: {
      type: 'STUDENT',
      id: 'demo_1',
      name: 'Aarav Reddy',
      first_name: 'Aarav',
      photo_url: settings.show_student_photo ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80' : null,
      initials: 'AR',
      class_name: settings.show_class ? 'VII' : null,
      section_name: settings.show_section ? 'A' : null,
    },
  };

  const dummyStaffSlide: CelebrationSlideItem = {
    id: 'preview_staff',
    slide_type: 'CELEBRATION',
    celebration_type: 'BIRTHDAY',
    priority: 70,
    title: 'Happy Birthday 🎉',
    message: staffPreviewMessage,
    person: {
      type: 'STAFF',
      id: 'demo_2',
      name: 'Mrs. Kavitha',
      first_name: 'Kavitha',
      photo_url: settings.show_staff_photo ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80' : null,
      initials: 'MK',
      designation: settings.show_staff_designation ? 'Mathematics Teacher' : null,
    },
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      refreshControl={(
        <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.colors.primary} />
      )}
    >
      {/* Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="albums-outline" size={26} color="#FFFFFF" />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Slide manager</Text>
          <Text style={styles.heroText}>
            Manage horizontal banners and automated Birthday celebrations on student and staff home.
          </Text>
        </View>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{items.filter((item) => item.is_active !== false).length} slides</Text>
        </View>
      </View>

      {/* Segmented Switcher */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'slides' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('slides')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="images-outline"
            size={16}
            color={activeTab === 'slides' ? '#FFFFFF' : theme.colors.textSecondary}
          />
          <Text style={[styles.segmentBtnText, activeTab === 'slides' && styles.segmentBtnTextActive]}>
            Hero Slides ({items.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'celebrations' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('celebrations')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="gift-outline"
            size={16}
            color={activeTab === 'celebrations' ? '#FFFFFF' : theme.colors.textSecondary}
          />
          <Text style={[styles.segmentBtnText, activeTab === 'celebrations' && styles.segmentBtnTextActive]}>
            Celebrations & Birthdays
          </Text>
          {settings.is_enabled && <View style={styles.tabBadgeDot} />}
        </TouchableOpacity>
      </View>

      {/* TAB 1: HERO SLIDES */}
      {activeTab === 'slides' ? (
        <>
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Add slides</Text>
                <Text style={styles.sectionHint}>Wide landscape photos work best · up to 12 total</Text>
              </View>
              <TouchableOpacity style={styles.chooseButton} onPress={choosePhotos} disabled={uploading} activeOpacity={0.8}>
                <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.chooseButtonText}>Choose photos</Text>
              </TouchableOpacity>
            </View>

            {!!selected.length && (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
                  {selected.map((photo, index) => (
                    <View key={`${photo.uri}-${index}`} style={styles.previewWrap}>
                      <Image source={{ uri: photo.uri }} style={styles.previewImage} />
                      <TouchableOpacity
                        style={styles.previewRemove}
                        onPress={() => setSelected((current) => current.filter((_, i) => i !== index))}
                        disabled={uploading}
                      >
                        <Ionicons name="close" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
                <Text style={styles.fieldLabel}>Title <Text style={styles.optional}>(optional)</Text></Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  maxLength={80}
                  placeholder="Admissions Open"
                  placeholderTextColor={theme.colors.textMuted}
                  style={styles.input}
                  editable={!uploading}
                />
                <Text style={styles.fieldLabel}>Caption <Text style={styles.optional}>(optional)</Text></Text>
                <TextInput
                  value={caption}
                  onChangeText={setCaption}
                  maxLength={180}
                  placeholder="A short line under the title"
                  placeholderTextColor={theme.colors.textMuted}
                  style={styles.input}
                  editable={!uploading}
                />
                <TouchableOpacity
                  style={[styles.publishButton, uploading && styles.disabled]}
                  onPress={uploadSelected}
                  disabled={uploading}
                  activeOpacity={0.8}
                >
                  {uploading ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />}
                  <Text style={styles.publishButtonText}>{uploading ? 'Uploading…' : 'Publish slides'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {loading ? (
            <View style={styles.stateBox}><ActivityIndicator color={theme.colors.primary} /></View>
          ) : items.length === 0 ? (
            <View style={styles.stateBox}>
              <View style={styles.emptyIcon}><Ionicons name="images-outline" size={28} color={theme.colors.textMuted} /></View>
              <Text style={styles.emptyTitle}>No slides yet</Text>
              <Text style={styles.stateText}>Upload a banner and students and staff can swipe it on home.</Text>
            </View>
          ) : (
            items.map((item, index) => (
              <View key={item.id} style={styles.slideRow}>
                <Image source={{ uri: getMediaUrl(item.image_url) }} style={styles.slideThumb} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Untitled slide'}</Text>
                  <Text style={styles.cardMeta} numberOfLines={2}>{item.caption || 'No caption'}</Text>
                  <View style={styles.rowActions}>
                    <View style={styles.activeRow}>
                      <Text style={styles.activeLabel}>{item.is_active === false ? 'Hidden' : 'Visible'}</Text>
                      <Switch
                        value={item.is_active !== false}
                        onValueChange={() => void toggleActive(item)}
                        disabled={workingId === item.id}
                      />
                    </View>
                    <TouchableOpacity onPress={() => void move(index, -1)} disabled={index === 0} style={styles.iconBtn}>
                      <Ionicons name="chevron-up" size={18} color={index === 0 ? theme.colors.textMuted : theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => void move(index, 1)} disabled={index === items.length - 1} style={styles.iconBtn}>
                      <Ionicons name="chevron-down" size={18} color={index === items.length - 1 ? theme.colors.textMuted : theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete(item)} disabled={workingId === item.id} style={styles.iconBtn}>
                      {workingId === item.id ? (
                        <ActivityIndicator size="small" color="#B91C1C" />
                      ) : (
                        <Ionicons name="trash-outline" size={18} color="#B91C1C" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </>
      ) : (
        /* TAB 2: CELEBRATIONS & BIRTHDAYS */
        <View style={{ gap: 16 }}>
          {/* Master Toggles Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Birthday Celebrations</Text>
            <Text style={styles.sectionHint}>
              Automatically detect active student & staff birthdays and present banners inside the home carousel.
            </Text>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Celebration Banners</Text>
                <Text style={styles.toggleHint}>Master toggle for all birthday banners in the school</Text>
              </View>
              <Switch
                value={settings.is_enabled}
                onValueChange={(val) => handleUpdateSetting('is_enabled', val)}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Student Birthdays</Text>
                <Text style={styles.toggleHint}>Show student celebration banners on eligible birthdays</Text>
              </View>
              <Switch
                value={settings.student_birthday_enabled}
                onValueChange={(val) => handleUpdateSetting('student_birthday_enabled', val)}
                disabled={!settings.is_enabled}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Staff Birthdays</Text>
                <Text style={styles.toggleHint}>Show staff celebration banners on eligible birthdays</Text>
              </View>
              <Switch
                value={settings.staff_birthday_enabled}
                onValueChange={(val) => handleUpdateSetting('staff_birthday_enabled', val)}
                disabled={!settings.is_enabled}
              />
            </View>

            <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Birthday Sound</Text>
                <Text style={styles.toggleHint}>Play a short celebration jingle once per user on birthday day</Text>
              </View>
              <Switch
                value={settings.birthday_music_enabled}
                onValueChange={(val) => handleUpdateSetting('birthday_music_enabled', val)}
                disabled={!settings.is_enabled}
              />
            </View>
          </View>

          {/* STUDENT TEMPLATE CARD */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Student Birthday Template</Text>
            <Text style={styles.sectionHint}>
              Configure message and appearance for student celebrations with live preview.
            </Text>

            {/* Live Preview */}
            <View style={styles.previewContainer}>
              <Text style={styles.previewHeading}>LIVE PREVIEW</Text>
              <CelebrationSlideCard slide={dummyStudentSlide} />
            </View>

            <Text style={styles.fieldLabel}>Greeting Message</Text>
            <TextInput
              value={settings.student_template}
              onChangeText={(text) => handleUpdateSetting('student_template', text)}
              multiline
              numberOfLines={3}
              style={[styles.input, { minHeight: 70, textAlignVertical: 'top', paddingTop: 10 }]}
              placeholder="Enter message template..."
              placeholderTextColor={theme.colors.textMuted}
            />

            {/* Placeholder insert chips */}
            <View style={styles.chipRow}>
              {['{{first_name}}', '{{full_name}}', '{{class}}', '{{section}}', '{{school_name}}'].map((chip) => (
                <TouchableOpacity
                  key={chip}
                  style={styles.chip}
                  onPress={() => {
                    handleUpdateSetting('student_template', `${settings.student_template} ${chip}`);
                  }}
                >
                  <Text style={styles.chipText}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Display options */}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Display Elements</Text>
            <View style={styles.toggleSubRow}>
              <Text style={styles.toggleSubLabel}>Show Student Photo</Text>
              <Switch
                value={settings.show_student_photo}
                onValueChange={(v) => handleUpdateSetting('show_student_photo', v)}
              />
            </View>
            <View style={styles.toggleSubRow}>
              <Text style={styles.toggleSubLabel}>Show Class</Text>
              <Switch
                value={settings.show_class}
                onValueChange={(v) => handleUpdateSetting('show_class', v)}
              />
            </View>
            <View style={styles.toggleSubRow}>
              <Text style={styles.toggleSubLabel}>Show Section</Text>
              <Switch
                value={settings.show_section}
                onValueChange={(v) => handleUpdateSetting('show_section', v)}
              />
            </View>

            {/* Audience Visibility */}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Audience Visibility</Text>
            <View style={styles.radioGroup}>
              {[
                { key: 'self_only', label: 'Self & Parents Only' },
                { key: 'class', label: 'Same Class & Staff (Recommended)' },
                { key: 'school', label: 'Entire School' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.radioBtn,
                    settings.student_visibility === opt.key && styles.radioBtnActive,
                  ]}
                  onPress={() => handleUpdateSetting('student_visibility', opt.key as any)}
                >
                  <Ionicons
                    name={settings.student_visibility === opt.key ? 'radio-button-on' : 'radio-button-off'}
                    size={16}
                    color={settings.student_visibility === opt.key ? theme.colors.primary : theme.colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.radioBtnText,
                      settings.student_visibility === opt.key && styles.radioBtnTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* STAFF TEMPLATE CARD */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Staff Birthday Template</Text>
            <Text style={styles.sectionHint}>
              Configure message and appearance for staff celebrations with live preview.
            </Text>

            {/* Live Preview */}
            <View style={styles.previewContainer}>
              <Text style={styles.previewHeading}>LIVE PREVIEW</Text>
              <CelebrationSlideCard slide={dummyStaffSlide} />
            </View>

            <Text style={styles.fieldLabel}>Greeting Message</Text>
            <TextInput
              value={settings.staff_template}
              onChangeText={(text) => handleUpdateSetting('staff_template', text)}
              multiline
              numberOfLines={3}
              style={[styles.input, { minHeight: 70, textAlignVertical: 'top', paddingTop: 10 }]}
              placeholder="Enter message template..."
              placeholderTextColor={theme.colors.textMuted}
            />

            {/* Placeholder insert chips */}
            <View style={styles.chipRow}>
              {['{{first_name}}', '{{full_name}}', '{{designation}}', '{{school_name}}'].map((chip) => (
                <TouchableOpacity
                  key={chip}
                  style={styles.chip}
                  onPress={() => {
                    handleUpdateSetting('staff_template', `${settings.staff_template} ${chip}`);
                  }}
                >
                  <Text style={styles.chipText}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Display options */}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Display Elements</Text>
            <View style={styles.toggleSubRow}>
              <Text style={styles.toggleSubLabel}>Show Staff Photo</Text>
              <Switch
                value={settings.show_staff_photo}
                onValueChange={(v) => handleUpdateSetting('show_staff_photo', v)}
              />
            </View>
            <View style={styles.toggleSubRow}>
              <Text style={styles.toggleSubLabel}>Show Designation</Text>
              <Switch
                value={settings.show_staff_designation}
                onValueChange={(v) => handleUpdateSetting('show_staff_designation', v)}
              />
            </View>

            {/* Audience Visibility */}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Audience Visibility</Text>
            <View style={styles.radioGroup}>
              {[
                { key: 'staff', label: 'Staff & Admin Only (Recommended)' },
                { key: 'school', label: 'Entire School (Include Parents)' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.radioBtn,
                    settings.staff_visibility === opt.key && styles.radioBtnActive,
                  ]}
                  onPress={() => handleUpdateSetting('staff_visibility', opt.key as any)}
                >
                  <Ionicons
                    name={settings.staff_visibility === opt.key ? 'radio-button-on' : 'radio-button-off'}
                    size={16}
                    color={settings.staff_visibility === opt.key ? theme.colors.primary : theme.colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.radioBtnText,
                      settings.staff_visibility === opt.key && styles.radioBtnTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, savingSettings && styles.disabled]}
            onPress={saveCelebrationSettings}
            disabled={savingSettings}
            activeOpacity={0.8}
          >
            {savingSettings ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.saveBtnText}>
              {savingSettings ? 'Saving Settings…' : settingsDirty ? 'Save Changes' : 'All Changes Saved'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    scroll: { padding: 18, paddingBottom: 52 },
    heroCard: {
      backgroundColor: theme.colors.primaryDark,
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    heroIcon: {
      width: 52, height: 52, borderRadius: 16,
      alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)',
    },
    heroCopy: { flex: 1 },
    heroTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
    heroText: { color: 'rgba(255,255,255,0.78)', fontSize: 13, lineHeight: 19, marginTop: 4 },
    livePill: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999,
    },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
    liveText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

    // Segment Switcher
    segmentContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 14,
      padding: 4,
      marginBottom: 18,
      gap: 4,
    },
    segmentBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 10,
      gap: 6,
    },
    segmentBtnActive: {
      backgroundColor: theme.colors.primary,
    },
    segmentBtnText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    segmentBtnTextActive: {
      color: '#FFFFFF',
    },
    tabBadgeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#FACC15',
    },

    card: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 20,
      padding: 18,
      marginBottom: 16,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    sectionTitle: { color: theme.colors.textStrong, fontSize: 18, fontWeight: '800' },
    sectionHint: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 3 },
    chooseButton: {
      minHeight: 42, paddingHorizontal: 14, borderRadius: 12, backgroundColor: theme.colors.primary,
      flexDirection: 'row', alignItems: 'center', gap: 7,
    },
    chooseButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
    previewRow: { gap: 10, paddingVertical: 16 },
    previewWrap: { width: 148, height: 86, borderRadius: 12, overflow: 'visible' },
    previewImage: { width: 148, height: 86, borderRadius: 12, backgroundColor: theme.colors.borderLight },
    previewRemove: {
      position: 'absolute', right: -6, top: -6, width: 24, height: 24, borderRadius: 12,
      backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center',
    },
    fieldLabel: { color: theme.colors.textStrong, fontSize: 13, fontWeight: '800', marginTop: 14, marginBottom: 7 },
    optional: { color: theme.colors.textMuted, fontWeight: '500' },
    input: {
      backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border,
      borderRadius: 12, paddingHorizontal: 13, minHeight: 44, color: theme.colors.textPrimary, fontSize: 14,
    },
    publishButton: {
      minHeight: 44, marginTop: 16, paddingHorizontal: 17, borderRadius: 12, backgroundColor: theme.colors.success,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    publishButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
    disabled: { opacity: 0.65 },
    stateBox: { minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: 28 },
    stateText: { color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 10 },
    emptyIcon: { width: 68, height: 68, borderRadius: 22, backgroundColor: theme.colors.borderLight, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { color: theme.colors.textStrong, fontSize: 17, fontWeight: '800', marginTop: 14 },
    slideRow: {
      flexDirection: 'row',
      gap: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 16,
      padding: 12,
      marginBottom: 12,
    },
    slideThumb: { width: 112, height: 72, borderRadius: 12, backgroundColor: theme.colors.borderLight },
    cardTitle: { color: theme.colors.textStrong, fontSize: 14, fontWeight: '800' },
    cardMeta: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 3 },
    rowActions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    activeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
    activeLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
    iconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

    // Celebration settings styles
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.borderLight,
      gap: 12,
    },
    toggleLabel: {
      color: theme.colors.textStrong,
      fontSize: 14,
      fontWeight: '700',
    },
    toggleHint: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    toggleSubRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    toggleSubLabel: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    previewContainer: {
      marginTop: 14,
      marginBottom: 10,
    },
    previewHeading: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: theme.colors.textMuted,
      marginBottom: 6,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    chip: {
      backgroundColor: theme.colors.borderLight,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    chipText: {
      color: theme.colors.primary,
      fontSize: 11,
      fontWeight: '700',
    },
    radioGroup: {
      gap: 8,
      marginTop: 4,
    },
    radioBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    radioBtnActive: {
      backgroundColor: theme.colors.borderLight,
      borderColor: theme.colors.primary,
    },
    radioBtnText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '500',
    },
    radioBtnTextActive: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
    saveBtn: {
      minHeight: 48,
      backgroundColor: theme.colors.primary,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 4,
      marginBottom: 20,
    },
    saveBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },
  });
}
