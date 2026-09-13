import type { Href } from 'expo-router';
import { Linking } from 'react-native';
import { openPlayStore } from '../../utils/openPlayStore';
import type { PopupActionType, PopupButton } from './types';

const SAFE_PARAM = /^[A-Za-z0-9._:@+\-]{1,80}$/;

export const POPUP_ACTION_KEYS = [
  'OPEN_FEES',
  'OPEN_ATTENDANCE',
  'OPEN_ATTENDANCE_ANALYTICS',
  'OPEN_RESULTS',
  'OPEN_HOMEWORK',
  'OPEN_TIMETABLE',
  'OPEN_TRANSPORT',
  'OPEN_NOTICES',
  'OPEN_PROFILE',
  'OPEN_REPORTS',
  'OPEN_COLLECTION_REPORT',
  'OPEN_RECONCILIATION',
  'OPEN_SUPPORT',
  'OPEN_UPDATE',
  'VIEW_ROUTE',
] as const;

export type PopupActionKey = (typeof POPUP_ACTION_KEYS)[number];

const ROLE_ROUTES: Record<PopupActionKey, Record<string, string>> = {
  OPEN_FEES: {
    parent: '/Screen/fees',
    student: '/Screen/fees',
    accounts: '/accounts/fees',
    accountant: '/accounts/fees',
    admin: '/admin/finance',
    principal: '/admin/finance',
  },
  OPEN_ATTENDANCE: {
    parent: '/Screen/attendance',
    student: '/Screen/attendance',
    staff: '/staff/manage-students',
    teacher: '/staff/manage-students',
    admin: '/admin/attendance',
    principal: '/admin/attendance',
  },
  OPEN_ATTENDANCE_ANALYTICS: {
    admin: '/admin/attendance-risk',
    principal: '/admin/attendance-risk',
    staff: '/staff/manage-students',
    teacher: '/staff/manage-students',
  },
  OPEN_RESULTS: {
    parent: '/results',
    student: '/results',
    staff: '/staff/results',
    teacher: '/staff/results',
    admin: '/admin/exams',
    principal: '/admin/exams',
  },
  OPEN_HOMEWORK: {
    parent: '/Screen/diary',
    student: '/Screen/diary',
    staff: '/staff/diary',
    teacher: '/staff/diary',
  },
  OPEN_TIMETABLE: {
    parent: '/Screen/timetable',
    student: '/Screen/timetable',
    staff: '/staff/timetable',
    teacher: '/staff/timetable',
    admin: '/admin/timetable',
    principal: '/admin/timetable',
    driver: '/driver/dashboard',
  },
  OPEN_TRANSPORT: {
    parent: '/Screen/busTracker',
    student: '/Screen/busTracker',
    driver: '/driver/dashboard',
    admin: '/admin/transport',
    principal: '/admin/transport',
  },
  OPEN_NOTICES: {
    parent: '/Screen/announcements',
    student: '/Screen/announcements',
    staff: '/staff/notices',
    teacher: '/staff/notices',
    admin: '/admin/notices',
    principal: '/admin/notices',
    accounts: '/updates',
    accountant: '/updates',
    driver: '/updates',
  },
  OPEN_PROFILE: {
    parent: '/Screen/profile',
    student: '/Screen/profile',
    staff: '/staff/profile',
    teacher: '/staff/profile',
    driver: '/driver/profile',
    admin: '/admin/settings',
    principal: '/admin/settings',
    accounts: '/accounts/settings',
    accountant: '/accounts/settings',
  },
  OPEN_REPORTS: {
    admin: '/admin/reports',
    principal: '/admin/reports',
    accounts: '/accounts/invoices',
    accountant: '/accounts/invoices',
  },
  OPEN_COLLECTION_REPORT: {
    accounts: '/accounts/fees/today-collection',
    accountant: '/accounts/fees/today-collection',
    admin: '/admin/reports',
    principal: '/admin/reports',
  },
  OPEN_RECONCILIATION: {
    accounts: '/accounts/fees',
    accountant: '/accounts/fees',
    admin: '/admin/finance',
    principal: '/admin/finance',
  },
  OPEN_SUPPORT: {
    parent: '/Screen/helpdesk',
    student: '/Screen/helpdesk',
    staff: '/staff/dashboard',
    teacher: '/staff/dashboard',
    admin: '/admin/helpdesk',
    principal: '/admin/helpdesk',
    accounts: '/accounts/dashboard',
    accountant: '/accounts/dashboard',
    driver: '/driver/profile',
  },
  OPEN_UPDATE: {},
  VIEW_ROUTE: {
    driver: '/driver/dashboard',
    admin: '/admin/transport',
    principal: '/admin/transport',
  },
};

function isSafeHttps(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && url.hostname !== 'localhost';
  } catch {
    return false;
  }
}

export function resolvePopupRoute(button: PopupButton, role: string | null | undefined): string | null {
  const actionType = button.actionType;
  const target = String(button.target || '').toUpperCase();
  const roleCode = String(role || '').toLowerCase();

  if (actionType === 'OPEN_SUPPORT') {
    return ROLE_ROUTES.OPEN_SUPPORT[roleCode] || '/Screen/helpdesk';
  }
  if (actionType === 'OPEN_MODULE' || actionType === 'OPEN_SCREEN' || actionType === 'OPEN_RECORD' || actionType === 'CUSTOM_ACTION') {
    const table = ROLE_ROUTES[target as PopupActionKey];
    if (!table) return null;
    return table[roleCode] || null;
  }
  return null;
}

export type PopupActionResult =
  | { kind: 'dismiss' }
  | { kind: 'acknowledge' }
  | { kind: 'route'; href: Href }
  | { kind: 'external' }
  | { kind: 'none' };

export async function executePopupAction(
  button: PopupButton,
  role: string | null | undefined,
): Promise<PopupActionResult> {
  const actionType = button.actionType;
  if (actionType === 'DISMISS') return { kind: 'dismiss' };
  if (actionType === 'ACKNOWLEDGE' || actionType === 'NONE') return { kind: 'acknowledge' };
  if (actionType === 'UPDATE_APP') {
    await openPlayStore();
    return { kind: 'external' };
  }
  if (actionType === 'EXTERNAL_URL' && button.target && isSafeHttps(button.target)) {
    await Linking.openURL(button.target);
    return { kind: 'external' };
  }
  if (actionType === 'CALL_PHONE' && button.target && /^[+0-9][0-9\s\-()]{6,20}$/.test(button.target)) {
    await Linking.openURL(`tel:${button.target.replace(/[^\d+]/g, '')}`);
    return { kind: 'external' };
  }
  const route = resolvePopupRoute(button, role);
  if (route) return { kind: 'route', href: route as Href };
  if (actionType === 'OPEN_SUPPORT') return { kind: 'route', href: '/Screen/helpdesk' as Href };
  return { kind: 'none' };
}

export function sanitizeQueuedPopupId(value: string | null | undefined): string | null {
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

export function isSafeParamValue(value: string): boolean {
  return SAFE_PARAM.test(value) && !value.includes('..') && !value.includes('/');
}
