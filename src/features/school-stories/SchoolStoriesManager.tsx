import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
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
  schoolStoriesService,
  type SchoolStoryAuthor,
  type SchoolStoryItem,
} from '../../services/schoolStoriesService';

type PickedPhoto = ImagePicker.ImagePickerAsset;

function hoursLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return 'Expired';
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours <= 0) return `${minutes}m left`;
  return `${hours}h ${minutes}m left`;
}

function flattenStories(authors: SchoolStoryAuthor[]) {
  return authors.flatMap((author) =>
    author.stories.map((story) => ({ author, story })),
  );
}

export default function SchoolStoriesManager({ scopeAll }: { scopeAll: boolean }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [authors, setAuthors] = useState<SchoolStoryAuthor[]>([]);
  const [selected, setSelected] = useState<PickedPhoto | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const rows = useMemo(() => flattenStories(authors), [authors]);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      setAuthors(await schoolStoriesService.manage(scopeAll));
    } catch (error: any) {
      alertCompat('Could not load school stories', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [scopeAll]);

  useEffect(() => {
    void load();
  }, [load]);

  const choosePhoto = async () => {
    if (uploading) return;
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        alertCompat('Photos permission needed', 'Allow photo library access to post a school story.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.92,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets?.[0]) setSelected(result.assets[0]);
  };

  const publish = async () => {
    if (!selected || uploading) return;
    setUploading(true);
    try {
      await schoolStoriesService.upload({
        uri: selected.uri,
        fileName: selected.fileName,
        mimeType: selected.mimeType,
        caption,
      });
      setSelected(null);
      setCaption('');
      await load(true);
      alertCompat('Story published', 'Everyone in the school can see this ring for 24 hours.');
    } catch (error: any) {
      alertCompat('Could not publish story', error?.message || 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = (story: SchoolStoryItem) => {
    if (deletingId) return;
    alertCompat(
      'Remove this story?',
      'It will disappear from home immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(story.id);
            try {
              await schoolStoriesService.remove(story.id);
              await load(true);
            } catch (error: any) {
              alertCompat('Could not remove story', error?.message || 'Please try again.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      refreshControl={(
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load(true)}
          tintColor={theme.colors.primary}
        />
      )}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="ellipse-outline" size={26} color="#FFFFFF" />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>School Stories</Text>
          <Text style={styles.heroText}>
            Photos posted here appear as 24-hour rings for students, staff, and admins. Teachers and admins can both publish.
          </Text>
        </View>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{rows.length} live</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Post a story</Text>
            <Text style={styles.sectionHint}>JPEG, PNG, WebP or HEIC · expires automatically in 24 hours</Text>
          </View>
          <TouchableOpacity style={styles.chooseButton} onPress={choosePhoto} disabled={uploading} activeOpacity={0.8}>
            <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
            <Text style={styles.chooseButtonText}>Choose photo</Text>
          </TouchableOpacity>
        </View>

        {selected ? (
          <>
            <View style={styles.previewWrap}>
              <Image source={{ uri: selected.uri }} style={styles.previewImage} />
              <TouchableOpacity style={styles.previewRemove} onPress={() => setSelected(null)} disabled={uploading}>
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>Caption <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              maxLength={180}
              placeholder="A short line everyone will see on the story"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              editable={!uploading}
            />
            <TouchableOpacity
              style={[styles.publishButton, uploading && styles.disabled]}
              onPress={publish}
              disabled={uploading}
              activeOpacity={0.8}
            >
              {uploading ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />}
              <Text style={styles.publishButtonText}>{uploading ? 'Publishing…' : 'Publish story'}</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.stateBox}><ActivityIndicator color={theme.colors.primary} /></View>
      ) : rows.length === 0 ? (
        <View style={styles.stateBox}>
          <View style={styles.emptyIcon}><Ionicons name="images-outline" size={28} color={theme.colors.textMuted} /></View>
          <Text style={styles.emptyTitle}>No live stories</Text>
          <Text style={styles.stateText}>Post a photo and it will appear on everyone’s home for 24 hours.</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {rows.map(({ author, story }) => (
            <View key={story.id} style={styles.photoCard}>
              <Image source={{ uri: getMediaUrl(story.media_url) }} style={styles.cardImage} />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>{author.author_name}</Text>
                <Text style={styles.cardMeta}>{author.author_role === 'admin' ? 'Admin' : 'Teacher'} · {hoursLeft(story.expires_at)}</Text>
                {!!story.caption && <Text style={styles.cardCaption} numberOfLines={2}>{story.caption}</Text>}
                {story.can_delete !== false ? (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => confirmDelete(story)}
                    disabled={deletingId === story.id}
                  >
                    {deletingId === story.id ? (
                      <ActivityIndicator size="small" color="#B91C1C" />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={15} color="#B91C1C" />
                        <Text style={styles.deleteText}>Remove</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))}
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 18,
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
    card: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 20,
      padding: 18,
      marginBottom: 22,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    sectionTitle: { color: theme.colors.textStrong, fontSize: 18, fontWeight: '800' },
    sectionHint: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 3 },
    chooseButton: {
      minHeight: 42, paddingHorizontal: 14, borderRadius: 12, backgroundColor: theme.colors.primary,
      flexDirection: 'row', alignItems: 'center', gap: 7,
    },
    chooseButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
    previewWrap: { width: 148, height: 196, borderRadius: 16, marginTop: 16, overflow: 'visible' },
    previewImage: { width: 148, height: 196, borderRadius: 16, backgroundColor: theme.colors.borderLight },
    previewRemove: {
      position: 'absolute', right: -6, top: -6, width: 24, height: 24, borderRadius: 12,
      backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center',
    },
    fieldLabel: { color: theme.colors.textStrong, fontSize: 12, fontWeight: '800', marginTop: 12, marginBottom: 7 },
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
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
    photoCard: {
      width: Platform.OS === 'web' ? 240 : '100%',
      maxWidth: '100%',
      borderRadius: 17,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cardImage: { width: '100%', height: 180, backgroundColor: theme.colors.borderLight },
    cardBody: { padding: 12, gap: 4 },
    cardTitle: { color: theme.colors.textStrong, fontSize: 14, fontWeight: '800' },
    cardMeta: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
    cardCaption: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, alignSelf: 'flex-start' },
    deleteText: { color: '#B91C1C', fontSize: 13, fontWeight: '800' },
  });
}
