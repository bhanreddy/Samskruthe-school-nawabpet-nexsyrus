import { apiClient } from './apiClient';
import { persistentQueryCache } from './persistentQueryCache';
import { SCHOOL_ID } from '../constants/school';

export type ContentType = 'THOUGHT' | 'NEWS' | 'ANNOUNCEMENT' | 'EVENT';
export type ContentStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'ARCHIVED';
export type ContentPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface ContentMediaItem {
  id?: string;
  media_type?: string;
  url: string;
  storage_path?: string;
  thumbnail_url?: string;
  caption?: string;
  sort_order?: number;
}

export interface ContentTarget {
  id?: string;
  target_type: 'SCHOOL' | 'ROLE' | 'CLASS' | 'SECTION' | 'USER';
  target_id: string;
}

export interface ContentVersion {
  id: string;
  version_number: number;
  change_summary?: string;
  created_at: string;
  changed_by_name?: string;
  changed_by_email?: string;
  snapshot?: any;
}

export interface ThoughtDetail {
  quote: string;
  author: string;
  author_description?: string;
  category: string;
  slot_date?: string;
  is_liked?: boolean;
  like_count?: number;
}

export interface NewsDetail {
  headline: string;
  source_name?: string;
  source_url?: string;
  category: string;
  location?: string;
  reading_time: number;
  tags?: string[];
  is_bookmarked?: boolean;
  is_liked?: boolean;
  like_count?: number;
  view_count?: number;
}

export interface ContentItem {
  id: string;
  school_id?: number;
  type: ContentType;
  title: string;
  summary?: string;
  body?: string;
  language?: string;
  status: ContentStatus;
  priority: ContentPriority;
  rejection_reason?: string;
  author_id?: string;
  author_name?: string;
  author_email?: string;
  approved_by?: string;
  published_by?: string;
  scheduled_at?: string;
  published_at?: string;
  expires_at?: string;
  is_featured: boolean;
  cover_image_url?: string;
  created_at: string;
  updated_at?: string;
  // Sub-objects
  thought?: ThoughtDetail;
  news?: NewsDetail;
  // Thought fields
  quote?: string;
  author?: string;
  author_description?: string;
  category?: string;
  slot_date?: string;
  // News fields
  headline?: string;
  source_name?: string;
  source_url?: string;
  news_category?: string;
  location?: string;
  reading_time?: number;
  tags?: string[];
  // Engagement
  is_bookmarked?: boolean;
  is_liked?: boolean;
  like_count?: number;
  view_count?: number;
  // Collections
  targets?: ContentTarget[];
  media?: ContentMediaItem[];
  versions?: ContentVersion[];
}

export interface DailyFeedResponse {
  date: string;
  thought: ContentItem | null;
  news: ContentItem[];
  featuredNews: ContentItem[];
  featured?: ContentItem[];
  categories: string[];
  isFromCache?: boolean;
  cachedAt?: number;
  metadata?: {
    cachedAt?: string | number;
    [key: string]: any;
  };
}

export type ContentItemDetail = ContentItem;
export type ContentVersionItem = ContentVersion;
export type ContentNewsDetail = ContentItem;
export type ContentThoughtDetail = ContentItem;
export type ContentMetricsResponse = AdminContentMetrics;
export type ContentTargetPayload = ContentTarget;

export interface ContentFilterParams {
  type?: ContentType;
  status?: ContentStatus;
  category?: string;
  author_id?: string;
  is_featured?: boolean;
  start_date?: string;
  end_date?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface NewsSource {
  id: string;
  school_id?: number;
  name: string;
  source_url?: string;
  source_type: string;
  category?: string;
  trust_level: string;
  is_active: boolean;
}

export interface AdminContentMetrics {
  overview: {
    totalPublishedThoughts: number;
    totalPublishedNews: number;
    pendingApprovals: number;
    scheduledItems: number;
    totalViews: number;
    uniqueViewers: number;
    totalLikes: number;
    totalBookmarks: number;
    totalShares: number;
    avgReadDurationSeconds: number;
  };
  topCategories: Array<{ category: string; view_count: string | number }>;
  topStories: Array<{
    id: string;
    type: string;
    title: string;
    published_at: string;
    views: string | number;
    likes: string | number;
    bookmarks: string | number;
  }>;
  total_published?: number;
  total_views?: number;
  unique_viewers?: number;
  total_likes?: number;
  total_bookmarks?: number;
  pending_approvals?: number;
  scheduled_count?: number;
  popular_categories?: Array<{ category: string; count: number | string }>;
}

const CACHE_SUFFIX = 'daily_feed';

/** apiClient unwraps `{ success, data }`; keep a fallback if an envelope still arrives. */
function unwrapApiPayload<T>(res: T | { success?: boolean; data?: T } | null | undefined): T | undefined {
  if (res == null) return undefined;
  if (typeof res === 'object' && (res as { success?: boolean }).success === true && 'data' in (res as object)) {
    return (res as { data?: T }).data;
  }
  return res as T;
}

export const contentService = {
  /**
   * Fetch Unified Daily Feed with local-first persistent cache.
   * Renders instantly from cache, fetches fresh in background.
   */
  async getDailyFeed(
    userIdOrOptions?: string | { userId?: string; forceFresh?: boolean; onFreshData?: (data: DailyFeedResponse) => void },
    legacyOnFreshData?: (data: DailyFeedResponse) => void
  ): Promise<DailyFeedResponse> {
    let userId = 'default_user';
    let forceFresh = false;
    let onFreshData = legacyOnFreshData;

    if (typeof userIdOrOptions === 'string') {
      userId = userIdOrOptions;
    } else if (userIdOrOptions && typeof userIdOrOptions === 'object') {
      if (userIdOrOptions.userId) userId = userIdOrOptions.userId;
      if (userIdOrOptions.forceFresh) forceFresh = true;
      if (userIdOrOptions.onFreshData) onFreshData = userIdOrOptions.onFreshData;
    }

    // 1. Read local cache first (unless forceFresh is requested)
    let cachedResult: DailyFeedResponse | null = null;
    if (!forceFresh && userId) {
      const cached = await persistentQueryCache.read<DailyFeedResponse>(userId, CACHE_SUFFIX);
      if (cached?.data) {
        cachedResult = {
          ...cached.data,
          featured: cached.data.featuredNews || cached.data.featured || [],
          isFromCache: true,
          cachedAt: cached.storedAt,
          metadata: {
            cachedAt: cached.storedAt,
          },
        };
      }
    }

    // 2. Fetch fresh network data in background.
    // silent: cache-first dashboard widget — a missing feed must not cover
    // the portal with a blocking Error dialog.
    const fetchPromise = apiClient
      .get<DailyFeedResponse>('/content/daily', undefined, { silent: true })
      .then((res) => {
        const payload = unwrapApiPayload<DailyFeedResponse>(res);
        const fresh: DailyFeedResponse = {
          date: payload?.date || new Date().toISOString().split('T')[0],
          thought: payload?.thought ?? null,
          news: payload?.news || [],
          featuredNews: payload?.featuredNews || payload?.featured || [],
          featured: payload?.featured || payload?.featuredNews || [],
          categories: payload?.categories || [],
        };
        const normalized: DailyFeedResponse = {
          ...fresh,
          featured: fresh.featuredNews || fresh.featured || [],
          isFromCache: false,
          cachedAt: Date.now(),
          metadata: {
            cachedAt: Date.now(),
          },
        };
        if (userId) {
          persistentQueryCache.write(userId, CACHE_SUFFIX, normalized, Date.now());
        }
        if (onFreshData) {
          onFreshData(normalized);
        }
        return normalized;
      })
      .catch((err) => {
        if (__DEV__) console.warn('[contentService] Network fetch failed, relying on cache:', err.message);
        if (cachedResult) return cachedResult;
        throw err;
      });

    // Return cached result immediately if present, otherwise await network fetch
    return cachedResult || (await fetchPromise);
  },

  /**
   * List content items with filters & pagination (Admin / Management)
   */
  async listContent(params: ContentFilterParams = {}): Promise<{ items: ContentItem[]; total: number }> {
    const res = await apiClient.get<{ items: ContentItem[]; total: number }>(
      '/content',
      params as any,
    );
    const data = unwrapApiPayload(res);
    return data?.items ? data : { items: [], total: 0 };
  },

  /**
   * Single content detail with version history & audit logs
   */
  async getContentById(id: string): Promise<ContentItem> {
    const res = await apiClient.get<ContentItem>(`/content/${id}`);
    return unwrapApiPayload(res) as ContentItem;
  },

  /**
   * Create Content Item (Thought or News)
   */
  async createContent(data: Partial<ContentItem> & Record<string, any>): Promise<ContentItem> {
    const res = await apiClient.post<ContentItem>('/content', data);
    return unwrapApiPayload(res) as ContentItem;
  },

  /**
   * Update Content Item
   */
  async updateContent(id: string, data: Partial<ContentItem> & Record<string, any>): Promise<ContentItem> {
    const res = await apiClient.patch<ContentItem>(`/content/${id}`, data);
    return unwrapApiPayload(res) as ContentItem;
  },

  /**
   * Soft delete
   */
  async deleteContent(id: string): Promise<void> {
    await apiClient.delete(`/content/${id}`);
  },

  /**
   * Workflow transitions
   */
  async submitContent(id: string): Promise<ContentItem> {
    const res = await apiClient.post<ContentItem>(`/content/${id}/submit`);
    return unwrapApiPayload(res) as ContentItem;
  },

  async approveContent(id: string): Promise<ContentItem> {
    const res = await apiClient.post<ContentItem>(`/content/${id}/approve`);
    return unwrapApiPayload(res) as ContentItem;
  },

  async rejectContent(id: string, rejectionReason: string): Promise<ContentItem> {
    const res = await apiClient.post<ContentItem>(`/content/${id}/reject`, {
      rejection_reason: rejectionReason,
    });
    return unwrapApiPayload(res) as ContentItem;
  },

  async publishContent(id: string): Promise<ContentItem> {
    const res = await apiClient.post<ContentItem>(`/content/${id}/publish`);
    return unwrapApiPayload(res) as ContentItem;
  },

  async scheduleContent(id: string, scheduledAt: string): Promise<ContentItem> {
    const res = await apiClient.post<ContentItem>(`/content/${id}/schedule`, {
      scheduled_at: scheduledAt,
    });
    return unwrapApiPayload(res) as ContentItem;
  },

  async archiveContent(id: string): Promise<ContentItem> {
    const res = await apiClient.post<ContentItem>(`/content/${id}/archive`);
    return unwrapApiPayload(res) as ContentItem;
  },

  async unpublishContent(id: string): Promise<ContentItem> {
    const res = await apiClient.post<ContentItem>(`/content/${id}/unpublish`);
    return unwrapApiPayload(res) as ContentItem;
  },

  async restoreVersion(id: string, versionNumber: number): Promise<{ success: boolean; versionNumber: number }> {
    const res = await apiClient.post<{ success: boolean; versionNumber: number }>(
      `/content/${id}/restore-version/${versionNumber}`,
    );
    return unwrapApiPayload(res) as { success: boolean; versionNumber: number };
  },

  /**
   * Bookmarks & Engagement
   */
  async toggleBookmark(contentId: string): Promise<{ bookmarked: boolean }> {
    const res = await apiClient.post<{ bookmarked: boolean }>(
      `/content/${contentId}/bookmark`,
    );
    return unwrapApiPayload(res) as { bookmarked: boolean };
  },

  async toggleLike(contentId: string): Promise<{ liked: boolean }> {
    const res = await apiClient.post<{ liked: boolean }>(
      `/content/${contentId}/like`,
    );
    return unwrapApiPayload(res) as { liked: boolean };
  },

  async listBookmarks(limit = 50, offset = 0): Promise<ContentItem[]> {
    const res = await apiClient.get<ContentItem[]>('/content/bookmarks', {
      limit,
      offset,
    });
    return unwrapApiPayload(res) || [];
  },

  async recordAnalytics(
    contentId: string,
    eventType: 'VIEW' | 'LIKE' | 'BOOKMARK' | 'SHARE' | 'READ_COMPLETED',
    durationSeconds = 0,
    metadata = {},
  ): Promise<void> {
    await apiClient
      .post(`/content/${contentId}/analytics`, {
        event_type: eventType,
        duration_seconds: durationSeconds,
        metadata,
      }, { silent: true })
      .catch(() => {});
  },

  /**
   * Media upload
   */
  async uploadMedia(formData: FormData): Promise<{ url: string; thumbnailUrl: string; storagePath: string }> {
    const res = await apiClient.uploadFormData<{ url: string; thumbnailUrl: string; storagePath: string }>(
      '/content/upload-media',
      formData,
    );
    return unwrapApiPayload(res) as { url: string; thumbnailUrl: string; storagePath: string };
  },

  /**
   * News sources
   */
  async listSources(): Promise<NewsSource[]> {
    const res = await apiClient.get<NewsSource[]>('/content/sources');
    return unwrapApiPayload(res) || [];
  },

  async createSource(data: Partial<NewsSource>): Promise<NewsSource> {
    const res = await apiClient.post<NewsSource>('/content/sources', data);
    return unwrapApiPayload(res) as NewsSource;
  },

  /**
   * Admin Metrics
   */
  async getAdminMetrics(days = 30): Promise<AdminContentMetrics> {
    const res = await apiClient.get<AdminContentMetrics>(
      '/content/admin/metrics',
      { days },
    );
    const data = unwrapApiPayload(res);
    if (data && data.overview) {
      data.total_published = (data.overview.totalPublishedThoughts || 0) + (data.overview.totalPublishedNews || 0);
      data.total_views = data.overview.totalViews || 0;
      data.unique_viewers = data.overview.uniqueViewers || 0;
      data.total_likes = data.overview.totalLikes || 0;
      data.total_bookmarks = data.overview.totalBookmarks || 0;
      data.pending_approvals = data.overview.pendingApprovals || 0;
      data.scheduled_count = data.overview.scheduledItems || 0;
      data.popular_categories = (data.topCategories || []).map((c) => ({
        category: c.category,
        count: c.view_count,
      }));
    }
    return data as AdminContentMetrics;
  },

  /**
   * Aliases for seamless developer ergonomics
   */
  async getContentItem(id: string): Promise<ContentItem> {
    return this.getContentById(id);
  },

  async getUserBookmarks(limit = 50, offset = 0): Promise<ContentItem[]> {
    return this.listBookmarks(limit, offset);
  },

  async recordEngagement(params: {
    contentId: string;
    eventType: 'VIEW' | 'LIKE' | 'BOOKMARK' | 'SHARE' | 'READ_COMPLETED';
    durationSeconds?: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    return this.recordAnalytics(
      params.contentId,
      params.eventType,
      params.durationSeconds || 0,
      params.metadata || {}
    );
  },
};
