import { FeatureMetadata, HeroArchetype, FEATURE_KEYS } from '../types';

export interface FeatureConfigItem extends FeatureMetadata {
  defaultBenefits: string[];
  minPlanTier: 'starter' | 'standard' | 'premium' | 'enterprise';
}

export const FEATURE_REGISTRY_CONFIG: Record<string, FeatureConfigItem> = {
  [FEATURE_KEYS.DASHBOARD]: {
    key: FEATURE_KEYS.DASHBOARD,
    name: 'School Dashboard',
    description: 'Central operational hub and daily telemetry metrics for leadership and faculty.',
    category: 'core',
    hero: 'ORBIT',
    minPlanTier: 'starter',
    defaultBenefits: [
      'Real-time daily attendance overview',
      'Action items and pending approvals list',
      'School-wide announcement telemetry',
    ],
  },
  [FEATURE_KEYS.STUDENT_MANAGEMENT]: {
    key: FEATURE_KEYS.STUDENT_MANAGEMENT,
    name: 'Student Records & Profiles',
    description: 'Comprehensive student profile lifecycle, class allocations, and guardian records.',
    category: 'academics',
    hero: 'GRID',
    minPlanTier: 'starter',
    defaultBenefits: [
      'Digital student enrollment records',
      'Class & section allocations with roll numbers',
      'Parent and guardian emergency contacts',
    ],
  },
  [FEATURE_KEYS.ATTENDANCE]: {
    key: FEATURE_KEYS.ATTENDANCE,
    name: 'Daily Attendance Engine',
    description: 'Twice-daily roll call tracking, absentee alerts, and institutional registers.',
    category: 'operations',
    hero: 'PULSE',
    minPlanTier: 'starter',
    defaultBenefits: [
      'Morning and afternoon attendance capture',
      'Instant SMS/Push absentee alerts to parents',
      'Monthly audit-ready attendance registers',
    ],
  },
  [FEATURE_KEYS.TIMETABLE]: {
    key: FEATURE_KEYS.TIMETABLE,
    name: 'Academic Timetable & Substitutions',
    description: 'Dynamic schedule generation, room conflict avoidance, and daily teacher replacement.',
    category: 'academics',
    hero: 'GRID',
    minPlanTier: 'starter',
    defaultBenefits: [
      'Collision-free period distribution',
      'One-tap daily substitution ranking engine',
      'Live student timetable synchronization',
    ],
  },
  [FEATURE_KEYS.FEES]: {
    key: FEATURE_KEYS.FEES,
    name: 'Fee Management & Collections',
    description: 'Multi-mode tuition billing, receipt generation, online payments, and dues recovery.',
    category: 'finance',
    hero: 'NEXUS',
    minPlanTier: 'standard',
    defaultBenefits: [
      'School-scoped audited receipt sequencing',
      'Automated SMS payment reminders',
      'Split installments and concession management',
    ],
  },
  [FEATURE_KEYS.TRANSPORT]: {
    key: FEATURE_KEYS.TRANSPORT,
    name: 'Fleet & Bus Tracking',
    description: 'Real-time bus tracking, route planning, driver check-in, and student safety notifications.',
    category: 'operations',
    hero: 'SIGNAL',
    minPlanTier: 'standard',
    defaultBenefits: [
      'Live GPS bus telemetry on campus map',
      'Geo-fenced stop arrival notifications',
      'Driver route and vehicle calibration',
    ],
  },
  [FEATURE_KEYS.EXAMINATIONS]: {
    key: FEATURE_KEYS.EXAMINATIONS,
    name: 'Examination & Assessment Suite',
    description: 'Hall tickets, invigilation rosters, grading policy, and report card publishing.',
    category: 'academics',
    hero: 'GRID',
    minPlanTier: 'standard',
    defaultBenefits: [
      'Automated hall ticket PDF generation',
      'Multi-assessment grading schemas and ranking',
      'Print-ready student progress report cards',
    ],
  },
  [FEATURE_KEYS.LMS]: {
    key: FEATURE_KEYS.LMS,
    name: 'Learning Management System',
    description: 'Digital course syllabus, teacher handouts, and video lesson distribution.',
    category: 'academics',
    hero: 'LENS',
    minPlanTier: 'standard',
    defaultBenefits: [
      'Centralized digital curriculum library',
      'Classroom handouts and syllabus distribution',
      'Embeddable lesson video materials',
    ],
  },
  [FEATURE_KEYS.ANALYTICS]: {
    key: FEATURE_KEYS.ANALYTICS,
    name: 'Executive Analytics',
    description: 'Real-time institutional performance analytics, fee realization, and trends.',
    category: 'intelligence',
    hero: 'LENS',
    minPlanTier: 'premium',
    defaultBenefits: [
      'Multi-year academic achievement trends',
      'Fee realization and cashflow projections',
      'Classroom attendance outlier analysis',
    ],
  },
  [FEATURE_KEYS.ADVANCED_REPORTS]: {
    key: FEATURE_KEYS.ADVANCED_REPORTS,
    name: 'Advanced Intelligence Reports',
    description: 'Cohort tracking, student retention telemetry, and board-ready executive summaries.',
    category: 'intelligence',
    hero: 'GRID',
    minPlanTier: 'premium',
    defaultBenefits: [
      'Executive board-ready PDF report exports',
      'Student retention and dropout risk models',
      'Custom cross-departmental data queries',
    ],
  },
  [FEATURE_KEYS.OMR_SCANNER]: {
    key: FEATURE_KEYS.OMR_SCANNER,
    name: 'OMR Optical Evaluation',
    description: 'High-speed camera evaluation of test sheets with instant answer key grading.',
    category: 'intelligence',
    hero: 'LENS',
    minPlanTier: 'premium',
    defaultBenefits: [
      'Instant optical sheet evaluation via mobile camera',
      'Real-time scoring against teacher answer keys',
      'Question difficulty analytics and discrimination curves',
    ],
  },
  [FEATURE_KEYS.VISITOR_MANAGEMENT]: {
    key: FEATURE_KEYS.VISITOR_MANAGEMENT,
    name: 'Campus Visitor Security',
    description: 'Digital gate badges, parent verification, overstay alerts, and watchlist screening.',
    category: 'security',
    hero: 'NEXUS',
    minPlanTier: 'premium',
    defaultBenefits: [
      'Instant digital badge check-in with photo capture',
      'Real-time campus headcount telemetry',
      'Blacklist and emergency security screening',
    ],
  },
  [FEATURE_KEYS.ACADEMIC_PLANNING]: {
    key: FEATURE_KEYS.ACADEMIC_PLANNING,
    name: 'Academic Curriculum Planner',
    description: 'Syllabus pacing, chapter health telemetry, and automatic revision scheduling.',
    category: 'academics',
    hero: 'GRID',
    minPlanTier: 'premium',
    defaultBenefits: [
      'Automated topic pacing and period weight allocation',
      'Curriculum delay indicators and health metrics',
      'Built-in revision buffers before term exams',
    ],
  },
  [FEATURE_KEYS.ACADEMIC_CALENDAR]: {
    key: FEATURE_KEYS.ACADEMIC_CALENDAR,
    name: 'Smart Academic Calendar',
    description: 'Institutional timeline, holiday synchronizations, and exam window management.',
    category: 'operations',
    hero: 'ORBIT',
    minPlanTier: 'premium',
    defaultBenefits: [
      'Dynamic institutional event milestones',
      'Exam schedule and holiday synchronization',
      'Interactive timeline view with push alerts',
    ],
  },
  [FEATURE_KEYS.EVENT_MANAGEMENT]: {
    key: FEATURE_KEYS.EVENT_MANAGEMENT,
    name: 'Institutional Event Suite',
    description: 'Ceremony organization, volunteer rosters, parent ticketing, and event media.',
    category: 'operations',
    hero: 'PULSE',
    minPlanTier: 'premium',
    defaultBenefits: [
      'Live attendee RSVP and gatekeeper check-in',
      'Staff volunteer duty allocations',
      'Digital event memory and media publishing',
    ],
  },
  [FEATURE_KEYS.CONTENT_ENGINE]: {
    key: FEATURE_KEYS.CONTENT_ENGINE,
    name: 'Daily Content Engine',
    description: 'Curated morning assembly thoughts, educational news, and school stories broadcast.',
    category: 'communication',
    hero: 'SIGNAL',
    minPlanTier: 'premium',
    defaultBenefits: [
      'Automated daily morning assembly thoughts',
      'Verified educational news briefings',
      'Interactive student and school story feeds',
    ],
  },
  [FEATURE_KEYS.ADMISSION_WORKFLOW]: {
    key: FEATURE_KEYS.ADMISSION_WORKFLOW,
    name: 'Admission CRM & Pipeline',
    description: 'Inquiry scoring, digital forms, interview scheduling, and document verification.',
    category: 'operations',
    hero: 'NEXUS',
    minPlanTier: 'premium',
    defaultBenefits: [
      'Comprehensive inquiry pipeline tracking',
      'Digital application document verification',
      'Automated fee structure assignment upon admission',
    ],
  },
  [FEATURE_KEYS.AI_ANECDOTE]: {
    key: FEATURE_KEYS.AI_ANECDOTE,
    name: 'AI Anecdote Intelligence',
    description: 'Extracts deep learning and behavioral signals from routine teacher remarks.',
    category: 'intelligence',
    hero: 'SIGNAL',
    minPlanTier: 'enterprise',
    defaultBenefits: [
      'Natural language behavioral signal detection',
      'Proactive learning intervention recommendations',
      'Longitudinal student temperament profiles',
    ],
  },
  [FEATURE_KEYS.CUSTOM_REPORTS]: {
    key: FEATURE_KEYS.CUSTOM_REPORTS,
    name: 'Custom Report Builder',
    description: 'Ad-hoc data queries and custom visual report designer for school boards.',
    category: 'intelligence',
    hero: 'GRID',
    minPlanTier: 'enterprise',
    defaultBenefits: [
      'Drag-and-drop report layout builder',
      'Custom mathematical aggregations',
      'Scheduled weekly email executive summaries',
    ],
  },
  [FEATURE_KEYS.AUTOMATION]: {
    key: FEATURE_KEYS.AUTOMATION,
    name: 'Autonomous Workflow Engine',
    description: 'Rule-based event triggers, custom webhooks, and auto-corrective actions.',
    category: 'intelligence',
    hero: 'NEXUS',
    minPlanTier: 'enterprise',
    defaultBenefits: [
      'Trigger-action automated workflows',
      'Auto-escalation of consecutive student absences',
      'Third-party software integration webhooks',
    ],
  },
  [FEATURE_KEYS.AI_PREDICTIVE_ENROLLMENT]: {
    key: FEATURE_KEYS.AI_PREDICTIVE_ENROLLMENT,
    name: 'Predictive Enrollment Intelligence',
    description: 'Capacity modeling and upcoming academic year enrollment forecasting.',
    category: 'intelligence',
    hero: 'SIGNAL',
    minPlanTier: 'enterprise',
    defaultBenefits: [
      'Classroom capacity risk forecasting',
      'Demographic student intake trends',
      'Budgetary tuition realization projections',
    ],
  },
};

export function getFeatureConfig(key: string): FeatureConfigItem {
  if (FEATURE_REGISTRY_CONFIG[key]) {
    return FEATURE_REGISTRY_CONFIG[key];
  }

  // Safe fallback for unlisted or future 2029 features
  return {
    key,
    name: formatKeyToTitle(key),
    description: 'Institutional capability and management tools.',
    category: 'operations',
    hero: 'ORBIT',
    minPlanTier: 'premium',
    defaultBenefits: [
      'Institutional operations telemetry',
      'Secure multi-tenant data access',
      'Automated administrative workflows',
    ],
  };
}

function formatKeyToTitle(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
