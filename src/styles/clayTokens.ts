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
