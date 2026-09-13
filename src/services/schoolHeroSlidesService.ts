import { api } from './apiClient';
import { appendImagePart } from '../utils/multipartImage';

export interface HeroSlideItem {
  id: string;
  image_url?: string;
  title?: string | null;
  caption?: string | null;
  display_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  slide_type?: 'IMAGE' | 'CELEBRATION';
  priority?: number;
}

export interface HeroSlideUpload {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  title?: string;
  caption?: string;
}

export const schoolHeroSlidesService = {
  async listActive(): Promise<HeroSlideItem[]> {
    const result = await api.get<{ items: HeroSlideItem[] }>('/school-hero-slides', undefined, { silent: true });
    return Array.isArray(result?.items) ? result.items : [];
  },

  async listManaged(): Promise<HeroSlideItem[]> {
    const result = await api.get<{ items: HeroSlideItem[] }>('/admin/school-hero-slides', undefined, { silent: true });
    return Array.isArray(result?.items) ? result.items : [];
  },

  async upload(upload: HeroSlideUpload): Promise<HeroSlideItem> {
    const formData = new FormData();
    await appendImagePart(
      formData,
      upload.uri,
      'image',
      upload.fileName || 'hero-slide.jpg',
      upload.mimeType || 'image/jpeg',
    );
    if (upload.title?.trim()) formData.append('title', upload.title.trim());
    if (upload.caption?.trim()) formData.append('caption', upload.caption.trim());
    const result = await api.uploadFormData<{ item: HeroSlideItem }>(
      '/admin/school-hero-slides',
      formData,
      { method: 'POST', timeoutMs: 90000, silent: true },
    );
    return result.item;
  },

  async update(id: string, patch: { title?: string | null; caption?: string | null; is_active?: boolean }): Promise<HeroSlideItem> {
    const result = await api.patch<{ item: HeroSlideItem }>(
      `/admin/school-hero-slides/${encodeURIComponent(id)}`,
      patch,
      { silent: true },
    );
    return result.item;
  },

  async reorder(ids: string[]): Promise<HeroSlideItem[]> {
    const result = await api.put<{ items: HeroSlideItem[] }>(
      '/admin/school-hero-slides/reorder',
      { ids },
      { silent: true },
    );
    return Array.isArray(result?.items) ? result.items : [];
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/admin/school-hero-slides/${encodeURIComponent(id)}`, { silent: true });
  },
};
