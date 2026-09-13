import { Platform } from 'react-native';

export async function appendImagePart(
  formData: FormData,
  uri: string,
  field = 'image',
  fileName = 'upload.jpg',
  mimeType = 'image/jpeg',
) {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append(field, blob, fileName);
    return;
  }

  formData.append(field, {
    uri,
    name: fileName,
    type: mimeType,
  } as any);
}
