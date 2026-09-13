import type { HeroSlideItem } from './schoolHeroSlidesService';

export interface CelebrationPerson {
  type: 'STUDENT' | 'STAFF';
  id: string;
  name: string;
  first_name?: string;
  photo_url?: string | null;
  initials: string;
  class_name?: string | null;
  section_name?: string | null;
  designation?: string | null;
  message?: string;
}

export interface CelebrationAudio {
  enabled: boolean;
  asset: string;
  play_once: boolean;
  event_key: string;
}

export interface CelebrationSlideItem {
  id: string;
  slide_type: 'CELEBRATION' | 'IMAGE';
  celebration_type?: 'BIRTHDAY';
  is_grouped?: boolean;
  priority: number;
  title?: string;
  message?: string;
  count?: number;
  person?: CelebrationPerson;
  stars?: CelebrationPerson[];
  audio?: CelebrationAudio;
  valid_from?: string;
  valid_until?: string;

  // Compatibility with normal HeroSlideItem
  image_url?: string;
  caption?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export interface SchoolCelebrationSettings {
  school_id?: number;
  is_enabled: boolean;
  student_birthday_enabled: boolean;
  staff_birthday_enabled: boolean;
  birthday_music_enabled: boolean;
  student_template: string;
  staff_template: string;
  student_visibility: 'self_only' | 'class' | 'school';
  staff_visibility: 'staff' | 'school';
  show_student_photo: boolean;
  show_staff_photo: boolean;
  show_class: boolean;
  show_section: boolean;
  show_staff_designation: boolean;
  created_at?: string;
  updated_at?: string;
}
