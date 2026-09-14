import { Platform } from 'react-native';
import type { SchoolTheme } from '../theme/types';
import { schoolColorWithAlpha } from '../constants/schoolConfig';

export const clayTokens = {
  colors: {
    // Premium muted palettes
    present: {
      bg: '#2F9C76', // Muted Emerald
      shadow: '#1A684D',
    },
    absent: {
      bg: '#D24151', // Soft Crimson
      shadow: '#8C222E',
    },
    pending: {
      bg: '#D46D23', // Warm Ochre
      shadow: '#8C410F',
    },
    surface: {
      light: '#7692E4',
      dark: '#3E4D7E',
    },
    shadow: {
      light: '#354A85',
      dark: '#1F2745',
    },
    brand: {
      violet: '#6C63FF',
      violetMid: '#8B85FF',
      emerald: '#00C4A0',
      rose: '#FF4D6A',
      amber: '#FFB01A',
      blue: '#3D8EFF',
      violetSoft: '#EEF0FF',
      emeraldSoft: '#E7FAF5',
      amberSoft: '#FFF6E0',
      roseSoft: '#FFE8ED',
    },
    /** Jewel clay fills for staff quick-action tiles. Muted, high white-text contrast. */
    tiles: {
      indigo: { bg: '#4454C4', dark: '#3543A0', shadow: '#283278' },
      bronze: { bg: '#8B6840', dark: '#705334', shadow: '#544028' },
      forest: { bg: '#217A4E', dark: '#1A623E', shadow: '#14482E' },
      burgundy: { bg: '#A03A52', dark: '#822E42', shadow: '#622232' },
      sapphire: { bg: '#2C68B0', dark: '#235490', shadow: '#1A3E6C' },
      copper: { bg: '#B05632', dark: '#8E4428', shadow: '#6C341E' },
      plum: { bg: '#7340A0', dark: '#5C3380', shadow: '#442660' },
      teal: { bg: '#157A74', dark: '#11625C', shadow: '#0C4844' },
      slate: { bg: '#4A5D78', dark: '#3A4A60', shadow: '#2A3848' },
      ochre: { bg: '#B06A1C', dark: '#8E5516', shadow: '#6C4010' },
      rosewood: { bg: '#B04458', dark: '#8E3646', shadow: '#6C2834' },
      navy: { bg: '#3A4C80', dark: '#2E3C66', shadow: '#222C4C' },
    },
    page: {
      light: '#E9EDF6',
      dark: '#0B1020',
    },
    card: {
      light: '#F4F7FD',
      dark: '#151D2D',
    },
    raised: {
      light: '#FFFFFF',
      dark: '#1A2332',
    },
    inset: {
      light: '#EEF1F8',
      dark: '#121824',
    },
    text: {
      primary: '#2A3142',
      muted: '#6B7590',
    },
    daily: {
      thoughtBg: '#F6F1EA',
      thoughtAccent: '#8B6840',
      thoughtSoft: '#F3E8D8',
      newsAccent: '#2C68B0',
      newsSoft: '#E7F0FA',
      ink: '#2A3142',
    },
  },
  radii: {
    card: 24,
    cardLg: 34,
    pill: 20,
    button: 16,
    input: 14,
    chip: 999,
  },
} as const;

/* ─────────────────────────────────────────────────────────────────────────────
 *  Accounts Dashboard Design Tokens (Mode A: Clay World, Glass Accents)
 *  Strict constraints:
 *  - Radii: Exactly two (24 cards, 16 controls/pills)
 *  - Typography: Exactly six sizes (12, 14, 16, 20, 24, 32), two weights (500, 700)
 *  - Palette: Neutral + One School Brand Accent + Strict Semantic (Danger/Warning/Success)
 *  - Material: Clay (light) → Glass (dark)
 *  - 60fps Android: Elevation <= 6, zero blur in scroll, max 1 gradient
 * ───────────────────────────────────────────────────────────────────────────── */

export interface DashboardTokens {
  mode: 'clay' | 'glass';
  isDark: boolean;
  radii: {
    card: 24;
    control: 16;
  };
  typography: {
    sizes: {
      xs: 12;
      sm: 14;
      md: 16;
      lg: 20;
      xl: 24;
      display: 32;
    };
    weights: {
      body: '500';
      display: '700';
    };
  };
  colors: {
    canvas: string;
    surface: string;
    surfaceElevated: string;
    surfaceBorder: string;
    surfaceBorderHighlight: string;
    surfaceShadow: string;
    innerPanel: string;
    innerBorder: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textInverse: string;
    brand: {
      primary: string;
      primaryLight: string;
      primarySoft: string;
      primaryBorder: string;
      shadow: string;
      gradient: [string, string];
    };
    semantic: {
      success: string;
      successSoft: string;
      successBorder: string;
      successGradient: [string, string];
      danger: string;
      dangerSoft: string;
      dangerBorder: string;
      dangerGradient: [string, string];
      warning: string;
      warningSoft: string;
      warningBorder: string;
      warningGradient: [string, string];
    };
    sheen: [string, string];
  };
  shadows: {
    card: any;
    cardRestWeb: string;
    cardPressedWeb: string;
    controlWeb: string;
  };
}

export function getDashboardTokens(theme: SchoolTheme, isDark: boolean): DashboardTokens {
  const brandPrimary = theme.colors.primary;
  const brandLight = theme.colors.primaryLight || theme.colors.primary;
  const brandDark = theme.colors.primaryDark || theme.colors.primary;

  const brandSoft = isDark
    ? schoolColorWithAlpha(brandPrimary, 0.16)
    : schoolColorWithAlpha(brandPrimary, 0.08);

  const brandBorder = isDark
    ? schoolColorWithAlpha(brandPrimary, 0.28)
    : schoolColorWithAlpha(brandPrimary, 0.18);

  const brandShadow = schoolColorWithAlpha(brandPrimary, isDark ? 0.35 : 0.20);

  const isWeb = Platform.OS === 'web';

  const cardRestWeb = isDark
    ? '0 10px 24px -8px rgba(0,0,0,0.65), 0 2px 6px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.08)'
    : '0 14px 28px -12px rgba(148,163,184,0.38), 0 3px 8px -2px rgba(148,163,184,0.18), inset 0 1px 1.5px rgba(255,255,255,0.95), inset 0 -2px 4px rgba(148,163,184,0.12)';

  const cardPressedWeb = isDark
    ? '0 4px 10px -4px rgba(0,0,0,0.6), inset 0 2px 4px rgba(0,0,0,0.4)'
    : '0 4px 10px -4px rgba(148,163,184,0.3), inset 0 2px 4px rgba(148,163,184,0.22), inset 0 -1px 2px rgba(255,255,255,0.7)';

  const controlWeb = isDark
    ? '0 4px 10px -3px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.12)'
    : '0 6px 14px -5px rgba(148,163,184,0.35), inset 0 1px 1px rgba(255,255,255,0.9), inset 0 -1.5px 2px rgba(148,163,184,0.15)';

  const cardNativeShadow = isDark
    ? {
        elevation: 2,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      }
    : {
        elevation: 4,
        shadowColor: '#475569',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      };

  return {
    mode: isDark ? 'glass' : 'clay',
    isDark,
    radii: {
      card: 24,
      control: 16,
    },
    typography: {
      sizes: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 20,
        xl: 24,
        display: 32,
      },
      weights: {
        body: '500',
        display: '700',
      },
    },
    colors: {
      canvas: theme.colors.background,
      surface: isDark ? 'rgba(21, 29, 45, 0.78)' : '#FFFFFF',
      surfaceElevated: isDark ? '#1A2332' : '#F4F7FD',
      surfaceBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.85)',
      surfaceBorderHighlight: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.95)',
      surfaceShadow: isDark ? '#000000' : '#94A3B8',
      innerPanel: isDark ? 'rgba(15, 23, 42, 0.55)' : 'rgba(241, 245, 249, 0.75)',
      innerBorder: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(148, 163, 184, 0.15)',
      textPrimary: theme.colors.textPrimary || (isDark ? '#FFFFFF' : '#0F172A'),
      textSecondary: theme.colors.textSecondary || (isDark ? '#94A3B8' : '#64748B'),
      textMuted: theme.colors.textMuted || (isDark ? '#64748B' : '#94A3B8'),
      textInverse: isDark ? '#0F172A' : '#FFFFFF',
      brand: {
        primary: brandPrimary,
        primaryLight: brandLight,
        primarySoft: brandSoft,
        primaryBorder: brandBorder,
        shadow: brandShadow,
        gradient: [brandPrimary, brandDark],
      },
      semantic: {
        success: theme.colors.success,
        successSoft: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.10)',
        successBorder: isDark ? 'rgba(16, 185, 129, 0.32)' : 'rgba(16, 185, 129, 0.22)',
        successGradient: [theme.colors.success, '#059669'],
        danger: theme.colors.danger,
        dangerSoft: isDark ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.10)',
        dangerBorder: isDark ? 'rgba(239, 68, 68, 0.32)' : 'rgba(239, 68, 68, 0.22)',
        dangerGradient: [theme.colors.danger, '#DC2626'],
        warning: theme.colors.warning,
        warningSoft: isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.10)',
        warningBorder: isDark ? 'rgba(245, 158, 11, 0.32)' : 'rgba(245, 158, 11, 0.22)',
        warningGradient: [theme.colors.warning, '#D97706'],
      },
      sheen: isDark
        ? ['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0)']
        : ['rgba(255, 255, 255, 0.40)', 'rgba(255, 255, 255, 0)'],
    },
    shadows: {
      card: isWeb ? { boxShadow: cardRestWeb } : cardNativeShadow,
      cardRestWeb,
      cardPressedWeb,
      controlWeb,
    },
  };
}
