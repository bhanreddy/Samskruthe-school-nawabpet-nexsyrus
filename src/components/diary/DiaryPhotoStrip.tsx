import React, { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { isPhotoFallbackContent, normalizeDiaryAttachments } from '../../utils/smartDiary/attachments';

export function diaryPhotoUrls(attachments: unknown): string[] {
  return normalizeDiaryAttachments(attachments);
}

export function isPhotoOnlyDiary(content?: string | null, attachments?: unknown): boolean {
  return diaryPhotoUrls(attachments).length > 0 && isPhotoFallbackContent(content);
}

export function diarySourceLabel(source?: string | null, hasPhoto = false): string | null {
  const value = String(source || '').toUpperCase();
  if (value === 'PHOTO' || (hasPhoto && !value)) return 'Photo';
  if (value === 'VOICE') return 'Voice';
  if (value === 'CLASS_DIARY_AI') return 'Class diary';
  if (value === 'TEMPLATE') return 'Template';
  if (value === 'REUSED' || value === 'COPIED') return 'Reused';
  if (hasPhoto) return 'Photo';
  return null;
}

export function DiaryPhotoStrip({
  attachments,
  hintColor,
}: {
  attachments?: unknown;
  hintColor?: string;
}) {
  const photos = diaryPhotoUrls(attachments);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  if (photos.length === 0) return null;

  return (
    <View>
      <View style={styles.row}>
        {photos.slice(0, 3).map((src) => (
          <Pressable key={src} onPress={() => setViewerUri(src)} style={styles.thumbWrap}>
            <Image source={{ uri: src }} style={styles.thumb} resizeMode="cover" />
          </Pressable>
        ))}
      </View>
      <Text style={[styles.hint, hintColor ? { color: hintColor } : null]}>Original diary photo</Text>
      <Modal visible={!!viewerUri} transparent animationType="fade" onRequestClose={() => setViewerUri(null)}>
        <Pressable style={styles.overlay} onPress={() => setViewerUri(null)}>
          {viewerUri ? <Image source={{ uri: viewerUri }} style={styles.full} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginTop: 12, gap: 8 },
  thumbWrap: { width: '100%' },
  thumb: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.06)',
  },
  hint: { marginTop: 6, fontSize: 11, fontWeight: '700' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11,16,32,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  full: { width: '100%', height: '80%' },
});
