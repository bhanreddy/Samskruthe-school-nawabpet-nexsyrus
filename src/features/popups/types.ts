export type PopupCategory =
  | 'INFORMATION' | 'WARNING' | 'IMPORTANT' | 'EMERGENCY' | 'FEATURE_UPDATE' | 'APP_UPDATE'
  | 'PAYMENT' | 'ATTENDANCE' | 'EXAM' | 'TRANSPORT' | 'DOCUMENT' | 'MAINTENANCE' | 'CUSTOM';

export type PopupPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
export type PopupLayout = 'COMPACT' | 'STANDARD' | 'RICH' | 'CRITICAL' | 'UPDATE';
export type PopupStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'ARCHIVED';
export type PopupFrequency =
  | 'SHOW_ONCE' | 'UNTIL_ACKNOWLEDGED' | 'EVERY_LOGIN' | 'ONCE_PER_DAY' | 'UNTIL_ACTION_COMPLETED';
export type PopupUpdateMode = 'NONE' | 'OPTIONAL_UPDATE' | 'FORCED_UPDATE';
export type PopupActionType =
  | 'NONE' | 'INTERNAL_ROUTE' | 'OPEN_MODULE' | 'OPEN_SCREEN' | 'OPEN_RECORD'
  | 'EXTERNAL_URL' | 'DOWNLOAD_DOCUMENT' | 'CALL_PHONE' | 'OPEN_SUPPORT'
  | 'UPDATE_APP' | 'ACKNOWLEDGE' | 'DISMISS' | 'CUSTOM_ACTION';
export type TargetRoleGroup = 'everyone' | 'management' | 'staff' | 'parent' | 'accounts' | 'driver';

export interface PopupButton {
  id: string;
  label: string;
  actionType: PopupActionType;
  target?: string | null;
  parameters?: Record<string, string>;
  visualStyle?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  order?: number;
}

export interface PopupTargeting {
  everyone?: boolean;
  roles: TargetRoleGroup[];
  class_ids: string[];
  section_ids: string[];
  student_ids: string[];
  user_ids: string[];
  staff_ids: string[];
  route_ids: string[];
  department_ids: string[];
}

export interface EligiblePopup {
  id: string;
  title: string;
  heading?: string | null;
  message: string;
  category: PopupCategory;
  priority: PopupPriority;
  layout_type: PopupLayout;
  image_url?: string | null;
  icon?: string | null;
  frequency: PopupFrequency;
  start_at: string;
  end_at?: string | null;
  allow_dismiss: boolean;
  require_acknowledgement: boolean;
  update_mode: PopupUpdateMode;
  buttons: PopupButton[];
  is_test?: boolean;
  unread?: boolean;
  acknowledged_at?: string | null;
  dismissed_at?: string | null;
  inbox_read_at?: string | null;
  status?: PopupStatus;
}

export interface AdminPopup extends EligiblePopup {
  school_id: number;
  status: PopupStatus;
  effective_status?: PopupStatus;
  targeting: PopupTargeting;
  completion_condition?: { type: 'NONE' | 'FEE_PENDING' };
  send_push?: boolean;
  created_by?: string | null;
  created_by_email?: string | null;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  unique_views?: number;
  views?: number;
  clicks?: number;
  acknowledgements?: number;
}

export const EMPTY_TARGETING: PopupTargeting = {
  everyone: false,
  roles: [],
  class_ids: [],
  section_ids: [],
  student_ids: [],
  user_ids: [],
  staff_ids: [],
  route_ids: [],
  department_ids: [],
};

export const PRIORITY_RANK: Record<PopupPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};
