import { api } from '../../services/apiClient';
import { appendImagePart } from '../../utils/multipartImage';
import type { AdminPopup, EligiblePopup, PopupTargeting } from './types';

export const popupApi = {
  async eligible(sessionId: string): Promise<EligiblePopup[]> {
    const result = await api.get<{ items: EligiblePopup[] }>(
      '/popups/eligible',
      { session_id: sessionId },
      { silent: true },
    );
    return Array.isArray(result?.items) ? result.items : [];
  },

  async inbox(unreadOnly = false): Promise<EligiblePopup[]> {
    const result = await api.get<{ items: EligiblePopup[] }>(
      '/popups/inbox',
      { unread_only: unreadOnly ? 'true' : 'false' },
      { silent: true },
    );
    return Array.isArray(result?.items) ? result.items : [];
  },

  async unreadCount(): Promise<number> {
    const result = await api.get<{ count: number }>('/popups/unread-count', undefined, { silent: true });
    return Number(result?.count || 0);
  },

  view(id: string, sessionId: string) {
    return api.post(`/popups/${encodeURIComponent(id)}/view`, { session_id: sessionId }, { silent: true });
  },

  click(id: string, actionType: string, target?: string | null) {
    return api.post(`/popups/${encodeURIComponent(id)}/click`, { actionType, target }, { silent: true });
  },

  dismiss(id: string) {
    return api.post(`/popups/${encodeURIComponent(id)}/dismiss`, {}, { silent: true });
  },

  acknowledge(id: string) {
    return api.post(`/popups/${encodeURIComponent(id)}/acknowledge`, {}, { silent: true });
  },

  read(id: string) {
    return api.post(`/popups/${encodeURIComponent(id)}/read`, {}, { silent: true });
  },

  async listAdmin(params: { status?: string; search?: string; page?: number } = {}) {
    return api.get<{ items: AdminPopup[]; page: number; has_more: boolean }>('/admin/popups', params, { silent: true });
  },

  overview() {
    return api.get<{ counts: Record<string, number>; total: number }>('/admin/popups/overview', undefined, { silent: true });
  },

  getAdmin(id: string) {
    return api.get<{ item: AdminPopup }>(`/admin/popups/${encodeURIComponent(id)}`, undefined, { silent: true });
  },

  create(body: Record<string, unknown>) {
    return api.post<{ item: AdminPopup }>('/admin/popups', body, { silent: true });
  },

  update(id: string, body: Record<string, unknown>) {
    return api.patch<{ item: AdminPopup }>(`/admin/popups/${encodeURIComponent(id)}`, body, { silent: true });
  },

  remove(id: string) {
    return api.delete(`/admin/popups/${encodeURIComponent(id)}`, { silent: true });
  },

  duplicate(id: string) {
    return api.post<{ item: AdminPopup }>(`/admin/popups/${encodeURIComponent(id)}/duplicate`, {}, { silent: true });
  },

  publish(id: string) {
    return api.post<{ item: AdminPopup }>(`/admin/popups/${encodeURIComponent(id)}/publish`, {}, { silent: true });
  },

  pause(id: string) {
    return api.post<{ item: AdminPopup }>(`/admin/popups/${encodeURIComponent(id)}/pause`, {}, { silent: true });
  },

  resume(id: string) {
    return api.post<{ item: AdminPopup }>(`/admin/popups/${encodeURIComponent(id)}/resume`, {}, { silent: true });
  },

  testSend(id: string) {
    return api.post(`/admin/popups/${encodeURIComponent(id)}/test-send`, {}, { silent: true });
  },

  analytics(id: string) {
    return api.get<Record<string, unknown>>(`/admin/popups/${encodeURIComponent(id)}/analytics`, undefined, { silent: true });
  },

  estimate(targeting: PopupTargeting) {
    return api.post<{ estimated_recipients: number }>('/admin/popups/estimate-audience', { targeting }, { silent: true });
  },

  async uploadImage(id: string, uri: string, fileName?: string | null, mimeType?: string | null) {
    const formData = new FormData();
    await appendImagePart(formData, uri, 'image', fileName || 'popup.jpg', mimeType || 'image/jpeg');
    return api.uploadFormData<{ item: AdminPopup }>(
      `/admin/popups/${encodeURIComponent(id)}/image`,
      formData,
      { method: 'POST', timeoutMs: 90000, silent: true },
    );
  },
};
