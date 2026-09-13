import { api } from './apiClient';
import { appendImagePart } from '../utils/multipartImage';

export interface SchoolStoryItem {
  id: string;
  media_url: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
  seen: boolean;
  can_delete?: boolean;
}

export interface SchoolStoryAuthor {
  author_id: string | null;
  author_name: string;
  author_photo_url: string | null;
  author_role: 'admin' | 'staff' | string;
  has_unseen: boolean;
  stories: SchoolStoryItem[];
}

export interface SchoolStoryUpload {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  caption?: string;
}

export const schoolStoriesService = {
  async list(): Promise<SchoolStoryAuthor[]> {
    const result = await api.get<{ authors: SchoolStoryAuthor[] }>('/school-stories', undefined, { silent: true });
    return Array.isArray(result?.authors) ? result.authors : [];
  },

  async manage(all = false): Promise<SchoolStoryAuthor[]> {
    const result = await api.get<{ authors: SchoolStoryAuthor[] }>(
      '/school-stories/manage',
      { all: all ? '1' : '0' },
      { silent: true },
    );
    return Array.isArray(result?.authors) ? result.authors : [];
  },

  async upload(upload: SchoolStoryUpload): Promise<SchoolStoryItem> {
    const formData = new FormData();
    await appendImagePart(
      formData,
      upload.uri,
      'image',
      upload.fileName || 'school-story.jpg',
      upload.mimeType || 'image/jpeg',
    );
    if (upload.caption?.trim()) formData.append('caption', upload.caption.trim());
    const result = await api.uploadFormData<{ item: SchoolStoryItem }>(
      '/school-stories',
      formData,
      { method: 'POST', timeoutMs: 90000, silent: true },
    );
    return result.item;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/school-stories/${encodeURIComponent(id)}`, { silent: true });
  },

  async markViewed(id: string): Promise<void> {
    await api.post(`/school-stories/${encodeURIComponent(id)}/view`, undefined, { silent: true });
  },
};
