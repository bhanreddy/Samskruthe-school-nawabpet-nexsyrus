import React from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Avatar } from './Avatar';

interface StudentPhotoFieldProps {
  currentPhotoUrl?: string | null;
  /** undefined = unchanged, null = remove, string = newly picked local URI */
  value?: string | null;
  studentName?: string | null;
  onChange: (value: string | null) => void;
  accentColor?: string;
  isDark?: boolean;
}

async function chooseFromCamera(): Promise<ImagePicker.ImagePickerResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Camera permission needed', 'Allow camera access to take a student profile photo.');
    return { canceled: true, assets: null };
  }
  return ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.9,
  });
}

async function chooseFromLibrary(): Promise<ImagePicker.ImagePickerResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Photos permission needed', 'Allow photo library access to choose a student profile photo.');
    return { canceled: true, assets: null };
  }
  return ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.9,
  });
}

export default function StudentPhotoField({
  currentPhotoUrl,
  value,
  studentName,
  onChange,
  accentColor = '#665990',
  isDark = false,
}: StudentPhotoFieldProps) {
  const displayedPhoto = value === undefined ? currentPhotoUrl : value;
  const hasPhoto = !!displayedPhoto;

  const acceptResult = (result: ImagePicker.ImagePickerResult) => {
    const uri = !result.canceled ? result.assets?.[0]?.uri : undefined;
    if (uri) onChange(uri);
  };

  const openPicker = () => {
    if (Platform.OS === 'web') {
      void chooseFromLibrary().then(acceptResult);
      return;
    }

    Alert.alert('Student Profile Picture', 'Choose a photo source', [
      { text: 'Take Photo', onPress: () => void chooseFromCamera().then(acceptResult) },
      { text: 'Choose from Library', onPress: () => void chooseFromLibrary().then(acceptResult) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={[
      styles.studio,
      {
        backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(102,89,144,0.045)',
        borderColor: hasPhoto ? `${accentColor}40` : (isDark ? 'rgba(124,111,255,0.16)' : 'rgba(102,89,144,0.12)'),
      },
    ]}>
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={hasPhoto ? 'Change student profile picture' : 'Add student profile picture'}
        style={styles.avatarButton}
      >
        <View style={[
          styles.photoFrame,
          hasPhoto
            ? { borderColor: accentColor, borderStyle: 'solid' }
            : { borderColor: isDark ? 'rgba(168,158,196,0.35)' : 'rgba(102,89,144,0.28)', borderStyle: 'dashed' },
        ]}>
          <Avatar
            photoUrl={displayedPhoto}
            name={studentName || 'New Student'}
            size={88}
            borderRadius={28}
          />
        </View>
        <View style={[styles.cameraBadge, { backgroundColor: accentColor }]}>
          <Ionicons name="camera" size={15} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      <View style={styles.copy}>
        <Text style={[styles.title, { color: isDark ? '#EDE8F5' : '#2D2640' }]}>
          Profile picture
        </Text>
        <Text style={[styles.help, { color: isDark ? '#A89EC4' : '#6B6280' }]}>
          Optional. Converted to JPEG and kept under 100 KB.
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.76}
            onPress={openPicker}
            style={[styles.actionButton, { backgroundColor: `${accentColor}14`, borderColor: `${accentColor}40` }]}
          >
            <Ionicons name={hasPhoto ? 'images-outline' : 'add-circle-outline'} size={15} color={accentColor} />
            <Text style={[styles.actionText, { color: accentColor }]}>
              {hasPhoto ? 'Change photo' : 'Add photo'}
            </Text>
          </TouchableOpacity>
          {hasPhoto && (
            <TouchableOpacity
              activeOpacity={0.76}
              onPress={() => onChange(null)}
              style={[styles.actionButton, styles.removeButton]}
            >
              <Ionicons name="trash-outline" size={15} color="#DC2626" />
              <Text style={[styles.actionText, styles.removeText]}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  studio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
  },
  avatarButton: {
    position: 'relative',
  },
  photoFrame: {
    padding: 3,
    borderRadius: 32,
    borderWidth: 1.5,
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  help: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  removeButton: {
    borderColor: 'rgba(220,38,38,0.28)',
    backgroundColor: 'rgba(220,38,38,0.06)',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  removeText: {
    color: '#DC2626',
  },
});
