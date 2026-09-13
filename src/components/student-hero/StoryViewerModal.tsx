import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from '../../utils/haptics';
import { getMediaUrl } from '../../utils/media';
import type { SchoolStoryAuthor, SchoolStoryItem } from '../../services/schoolStoriesService';
import { schoolStoriesService } from '../../services/schoolStoriesService';

const STORY_MS = 5200;

interface Props {
  authors: SchoolStoryAuthor[];
  startAuthorIndex: number;
  visible: boolean;
  onClose: () => void;
  onViewed: (storyId: string) => void;
}

export default function StoryViewerModal({
  authors,
  startAuthorIndex,
  visible,
  onClose,
  onViewed,
}: Props) {
  const insets = useSafeAreaInsets();
  const [authorIndex, setAuthorIndex] = useState(startAuthorIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const viewedRef = useRef<Set<string>>(new Set());
  const holdRef = useRef(false);

  const author = authors[authorIndex];
  const stories = author?.stories ?? [];
  const story: SchoolStoryItem | undefined = stories[storyIndex];

  useEffect(() => {
    if (!visible) return;
    setAuthorIndex(Math.max(0, Math.min(startAuthorIndex, Math.max(authors.length - 1, 0))));
    const startAuthor = authors[startAuthorIndex];
    const unseen = startAuthor?.stories.findIndex((item) => !item.seen) ?? 0;
    setStoryIndex(unseen >= 0 ? unseen : 0);
    setProgress(0);
    // Intentionally ignore later `authors` identity changes (seen flags) so playback is not reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, startAuthorIndex]);

  const markCurrent = useCallback((item?: SchoolStoryItem) => {
    if (!item || viewedRef.current.has(item.id)) return;
    viewedRef.current.add(item.id);
    onViewed(item.id);
    void schoolStoriesService.markViewed(item.id);
  }, [onViewed]);

  useEffect(() => {
    if (!visible || !story) return;
    markCurrent(story);
  }, [visible, story, markCurrent]);

  const goNext = useCallback(() => {
    if (!author) return;
    if (storyIndex < stories.length - 1) {
      setStoryIndex((current) => current + 1);
      setProgress(0);
      return;
    }
    if (authorIndex < authors.length - 1) {
      setAuthorIndex((current) => current + 1);
      setStoryIndex(0);
      setProgress(0);
      return;
    }
    onClose();
  }, [author, authorIndex, authors.length, onClose, stories.length, storyIndex]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((current) => current - 1);
      setProgress(0);
      return;
    }
    if (authorIndex > 0) {
      const previous = authors[authorIndex - 1];
      setAuthorIndex((current) => current - 1);
      setStoryIndex(Math.max(0, (previous?.stories.length || 1) - 1));
      setProgress(0);
      return;
    }
    setProgress(0);
  }, [authorIndex, authors, storyIndex]);

  useEffect(() => {
    if (!visible || !story) return;
    setProgress(0);
    const started = Date.now();
    const tick = setInterval(() => {
      if (holdRef.current) return;
      const next = Math.min(1, (Date.now() - started) / STORY_MS);
      setProgress(next);
      if (next >= 1) {
        clearInterval(tick);
        goNext();
      }
    }, 50);
    return () => clearInterval(tick);
  }, [visible, story?.id, goNext]);

  const mediaUri = useMemo(() => getMediaUrl(story?.media_url), [story?.media_url]);
  const avatarUri = useMemo(() => getMediaUrl(author?.author_photo_url), [author?.author_photo_url]);

  if (!visible || !author || !story) return null;

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.progressRow}>
          {stories.map((item, index) => (
            <View key={item.id} style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width:
                      index < storyIndex
                        ? '100%'
                        : index === storyIndex
                          ? `${Math.round(progress * 100)}%`
                          : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={styles.topBar}>
          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarFallback}>{(author.author_name || 'S').slice(0, 1)}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.authorName} numberOfLines={1}>{author.author_name}</Text>
              <Text style={styles.authorMeta}>
                {author.author_role === 'admin' ? 'Admin' : 'Teacher'} · expires in 24h
              </Text>
            </View>
          </View>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close story">
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.stage}>
          {mediaUri ? (
            <Image source={{ uri: mediaUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : null}
          <Pressable
            style={styles.tapLeft}
            onPress={() => { void Haptics.selectionAsync(); goPrev(); }}
            onLongPress={() => { holdRef.current = true; }}
            onPressOut={() => { holdRef.current = false; }}
          />
          <Pressable
            style={styles.tapRight}
            onPress={() => { void Haptics.selectionAsync(); goNext(); }}
            onLongPress={() => { holdRef.current = true; }}
            onPressOut={() => { holdRef.current = false; }}
          />
          {!!story.caption && (
            <View style={styles.captionWrap}>
              <Text style={styles.caption}>{story.caption}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050816' },
  progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 12, marginBottom: 10 },
  progressTrack: { flex: 1, height: 3, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: 99 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 10 },
  authorRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', backgroundColor: '#1E3A8A', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: { color: '#FFF', fontWeight: '800' },
  authorName: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  authorMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 1 },
  stage: { flex: 1, marginHorizontal: 8, marginBottom: Platform.OS === 'web' ? 18 : 10, borderRadius: 22, overflow: 'hidden', backgroundColor: '#0B1224' },
  tapLeft: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '34%' },
  tapRight: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '66%' },
  captionWrap: { position: 'absolute', left: 14, right: 14, bottom: 18, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  caption: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', lineHeight: 20 },
});
