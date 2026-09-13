import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ImagePickerAsset } from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { alertCompat } from '../../utils/crossPlatformAlert';
import { schoolStoriesService } from '../../services/schoolStoriesService';

interface AddStoryComposerProps {
  visible: boolean;
  photo: ImagePickerAsset | null;
  onClose: () => void;
  onPublished: () => void | Promise<void>;
}

export default function AddStoryComposer({
  visible,
  photo,
  onClose,
  onPublished,
}: AddStoryComposerProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const close = () => {
    if (uploading) return;
    setCaption('');
    onClose();
  };

  const publish = async () => {
    if (!photo || uploading) return;
    setUploading(true);
    try {
      await schoolStoriesService.upload({
        uri: photo.uri,
        fileName: photo.fileName,
        mimeType: photo.mimeType,
        caption,
      });
      setCaption('');
      onClose();
      await onPublished();
      alertCompat('Story published', 'Everyone in the school can see this ring for 24 hours.');
    } catch (error: any) {
      alertCompat('Could not publish story', error?.message || 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible && !!photo} animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: isDark ? '#080B14' : '#F4F6FB', paddingTop: Math.max(insets.top, 12) }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topBar}>
          <Pressable onPress={close} disabled={uploading} hitSlop={10} style={styles.iconBtn}>
            <Ionicons name="close" size={22} color={theme.colors.textStrong} />
          </Pressable>
          <Text style={[styles.title, { color: theme.colors.textStrong }]}>Add story</Text>
          <Pressable
            onPress={() => void publish()}
            disabled={uploading}
            style={[styles.publishChip, uploading && styles.disabled]}
          >
            {uploading ? <ActivityIndicator color="#FFFFFF" size="small" /> : (
              <Text style={styles.publishChipText}>Share</Text>
            )}
          </Pressable>
        </View>

        {photo ? (
          <Image source={{ uri: photo.uri }} style={styles.preview} resizeMode="cover" />
        ) : null}

        <TextInput
          value={caption}
          onChangeText={setCaption}
          maxLength={180}
          placeholder="Add a caption"
          placeholderTextColor={theme.colors.textMuted}
          style={[
            styles.input,
            {
              color: theme.colors.textPrimary,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          editable={!uploading}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 18 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800' },
  publishChip: {
    minWidth: 72,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  publishChipText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.65 },
  preview: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
  },
  input: {
    marginTop: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    fontSize: 15,
  },
});
