import { api } from '../../../services/apiClient';
import { FeatureAccessResponse } from '../types';

export interface EntitlementsPayload {
  schoolId: number;
  role: string;
  features: Record<string, { allowed: boolean; state: string; requiredPlan?: string }>;
  timestamp: string;
}

export interface AccessRequestResult {
  alreadyRequested: boolean;
  requestId: string;
  message: string;
  createdAt: string;
}

export interface NotifyMeResult {
  alreadySubscribed: boolean;
  message: string;
}

export interface AdminAccessRequestItem {
  id: string;
  feature_key: string;
  feature_name: string;
  requested_by: string;
  user_role: string;
  user_name: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  request_message: string | null;
  created_at: string;
}

export const FeatureAccessApi = {
  /**
   * Fetch single feature entitlement from authoritative backend.
   */
  fetchFeatureAccess: async (featureKey: string): Promise<FeatureAccessResponse> => {
    return api.get<FeatureAccessResponse>(`/feature-access/${encodeURIComponent(featureKey)}`, undefined, {
      silent: true,
    });
  },

  /**
   * Fetch all entitlements for current school/user session in bulk.
   */
  fetchAllEntitlements: async (): Promise<EntitlementsPayload> => {
    return api.get<EntitlementsPayload>('/feature-access', undefined, { silent: true });
  },

  /**
   * Submit access request to school administrator.
   */
  requestAccess: async (
    featureKey: string,
    payload?: { message?: string; userName?: string }
  ): Promise<AccessRequestResult> => {
    return api.post<AccessRequestResult>(`/feature-access/${encodeURIComponent(featureKey)}/request-access`, payload || {});
  },

  /**
   * Subscribe to notifications for coming-soon feature.
   */
  notifyMe: async (featureKey: string): Promise<NotifyMeResult> => {
    return api.post<NotifyMeResult>(`/feature-access/${encodeURIComponent(featureKey)}/notify-me`, {});
  },

  /**
   * School administrator: get all pending feature access requests.
   */
  getAdminRequests: async (): Promise<{ requests: AdminAccessRequestItem[] }> => {
    return api.get<{ requests: AdminAccessRequestItem[] }>('/feature-access/admin/requests', undefined, {
      silent: true,
    });
  },

  /**
   * School administrator: approve or reject request.
   */
  respondToRequest: async (
    requestId: string,
    status: 'APPROVED' | 'REJECTED'
  ): Promise<{ request: AdminAccessRequestItem }> => {
    return api.post<{ request: AdminAccessRequestItem }>(
      `/feature-access/admin/requests/${encodeURIComponent(requestId)}/respond`,
      { status }
    );
  },
};
