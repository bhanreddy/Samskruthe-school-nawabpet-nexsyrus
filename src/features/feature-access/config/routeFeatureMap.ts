import { FEATURE_KEYS, FeatureKey } from '../types';

/**
 * Route-to-Feature Mapping
 * Maps active Expo Router route patterns to permanent machine-readable feature keys.
 * Uses the actual routes present in the codebase.
 */
export const ROUTE_FEATURE_MAP: Record<string, FeatureKey> = {
  // Admin Analytics & Intelligence
  '/admin/analytics': FEATURE_KEYS.ANALYTICS,
  '/admin/smart-insights': FEATURE_KEYS.ANALYTICS,
  '/admin/school-intelligence': FEATURE_KEYS.ANALYTICS,
  '/admin/attendance-risk': FEATURE_KEYS.ANALYTICS,

  // Reports
  '/admin/reports': FEATURE_KEYS.ADVANCED_REPORTS,
  '/admin/audit-explorer': FEATURE_KEYS.ADVANCED_REPORTS,

  // OMR Scanner
  '/admin/omr': FEATURE_KEYS.OMR_SCANNER,
  '/accounts/omr-print': FEATURE_KEYS.OMR_SCANNER,
  '/accounts/omr-answer-key': FEATURE_KEYS.OMR_SCANNER,

  // Visitor Management
  '/admin/visitors': FEATURE_KEYS.VISITOR_MANAGEMENT,

  // Academic Planning & Curriculum
  '/admin/academic-planner': FEATURE_KEYS.ACADEMIC_PLANNING,
  '/admin/question-papers': FEATURE_KEYS.ACADEMIC_PLANNING,

  // Calendar
  '/admin/calendar': FEATURE_KEYS.ACADEMIC_CALENDAR,
  '/(tabs)/calendar': FEATURE_KEYS.ACADEMIC_CALENDAR,

  // Events
  '/admin/events': FEATURE_KEYS.EVENT_MANAGEMENT,

  // Content Engine
  '/admin/content': FEATURE_KEYS.CONTENT_ENGINE,

  // Admissions
  '/admin/admissions': FEATURE_KEYS.ADMISSION_WORKFLOW,

  // Core Operations
  '/admin/fees': FEATURE_KEYS.FEES,
  '/(tabs)/fees': FEATURE_KEYS.FEES,
  '/admin/transport': FEATURE_KEYS.TRANSPORT,
  '/admin/live-bus-tracking': FEATURE_KEYS.TRANSPORT,
  '/admin/timetable': FEATURE_KEYS.TIMETABLE,
  '/(tabs)/timetable': FEATURE_KEYS.TIMETABLE,
  '/admin/exams': FEATURE_KEYS.EXAMINATIONS,
  '/(tabs)/results': FEATURE_KEYS.EXAMINATIONS,
  '/admin/attendance': FEATURE_KEYS.ATTENDANCE,
  '/admin/students': FEATURE_KEYS.STUDENT_MANAGEMENT,
};

/**
 * Resolves the corresponding featureKey for a given route path or segment array.
 */
export function resolveFeatureKeyFromRoute(routePath: string): FeatureKey | null {
  if (!routePath) return null;

  // Exact match first
  const normalized = routePath.startsWith('/') ? routePath : `/${routePath}`;
  if (ROUTE_FEATURE_MAP[normalized]) {
    return ROUTE_FEATURE_MAP[normalized];
  }

  // Prefix match (e.g. /admin/analytics/overview matches /admin/analytics)
  for (const [pattern, key] of Object.entries(ROUTE_FEATURE_MAP)) {
    if (normalized === pattern || normalized.startsWith(`${pattern}/`)) {
      return key;
    }
  }

  return null;
}
