import { api } from './apiClient';
import type { SchoolCelebrationSettings } from './celebrationTypes';

export const celebrationSettingsService = {
  async getSettings(): Promise<SchoolCelebrationSettings> {
    const result = await api.get<{ settings: SchoolCelebrationSettings }>(
      '/admin/celebrations/settings',
      undefined,
      { silent: true },
    );
    return result.settings;
  },

  async updateSettings(patch: Partial<SchoolCelebrationSettings>): Promise<SchoolCelebrationSettings> {
    const result = await api.put<{ settings: SchoolCelebrationSettings }>(
      '/admin/celebrations/settings',
      patch,
      { silent: true },
    );
    return result.settings;
  },
};
