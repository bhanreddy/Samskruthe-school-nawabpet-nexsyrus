/**
 * Universal Feature Access Types
 * SchoolIMS 5.1.8 Core Platform Architecture
 *
 * Defines permanent machine-readable states, actions, archetypes, and response contracts.
 * Designed for strict 3-year stability.
 */

export enum FeatureAccessState {
  ALLOWED = 'ALLOWED',
  PLAN_REQUIRED = 'PLAN_REQUIRED',
  FEATURE_DISABLED = 'FEATURE_DISABLED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ADMIN_APPROVAL_REQUIRED = 'ADMIN_APPROVAL_REQUIRED',
  COMING_SOON = 'COMING_SOON',
  BETA = 'BETA',
  MAINTENANCE = 'MAINTENANCE',
  TEMPORARILY_UNAVAILABLE = 'TEMPORARILY_UNAVAILABLE',
  INVALID_ROUTE = 'INVALID_ROUTE',
  ACCESS_CHECK_FAILED = 'ACCESS_CHECK_FAILED',
}

export const FEATURE_KEYS = {
  DASHBOARD: 'dashboard',
  STUDENT_MANAGEMENT: 'student_management',
  ATTENDANCE: 'attendance',
  TIMETABLE: 'timetable',
  DIARY: 'diary',
  FEES: 'fees',
  TRANSPORT: 'transport',
  EXAMINATIONS: 'examinations',
  LMS: 'lms',
  ANALYTICS: 'analytics',
  ADVANCED_REPORTS: 'advanced_reports',
  OMR_SCANNER: 'omr_scanner',
  VISITOR_MANAGEMENT: 'visitor_management',
  ACADEMIC_PLANNING: 'academic_planning',
  ACADEMIC_CALENDAR: 'academic_calendar',
  EVENT_MANAGEMENT: 'event_management',
  CONTENT_ENGINE: 'content_engine',
  ADMISSION_WORKFLOW: 'admission_workflow',
  AI_ANECDOTE: 'ai_anecdote',
  CUSTOM_REPORTS: 'custom_reports',
  AUTOMATION: 'automation',
  AI_PREDICTIVE_ENROLLMENT: 'ai_predictive_enrollment',
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS] | (string & {});

export type GatewayActionType =
  | 'UPGRADE_PLAN'
  | 'ASK_ADMIN'
  | 'REQUEST_ACCESS'
  | 'NOTIFY_ME'
  | 'REQUEST_EARLY_ACCESS'
  | 'OPEN_FEATURE_DETAILS'
  | 'GO_BACK'
  | 'GO_HOME'
  | 'RETRY'
  | 'CONTACT_SUPPORT';

export type HeroArchetype =
  | 'ORBIT'
  | 'SIGNAL'
  | 'GRID'
  | 'LENS'
  | 'PULSE'
  | 'NEXUS';

export type MotionProfile = 'HIGH' | 'MEDIUM' | 'LOW';

export interface GatewayAction {
  type: GatewayActionType;
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export interface GatewayUIContent {
  eyebrow: string;
  title: string;
  description: string;
  benefits: string[];
}

export interface FeatureMetadata {
  key: string;
  name: string;
  description: string;
  category: string;
  hero: HeroArchetype;
  icon?: string;
}

export interface FeatureAccessSubscription {
  currentPlan: string;
  requiredPlan: string;
  requiredPlanName?: string;
  status?: string;
}

export interface FeatureAccessResponse {
  allowed: boolean;
  state: FeatureAccessState;
  feature: FeatureMetadata;
  subscription?: FeatureAccessSubscription;
  ui: GatewayUIContent;
  actions: GatewayAction[];
  reason?: string;
}

export interface CachedEntitlement {
  allowed: boolean;
  state: FeatureAccessState;
  requiredPlan?: string;
  cachedAt: number;
  expiresAt: number;
  version: string;
}
