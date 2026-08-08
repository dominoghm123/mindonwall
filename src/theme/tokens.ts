/**
 * v0.5 Design Token System.
 * Modern minimalist palette (Linear/Notion inspired) with warm journal accent.
 */

export const tokens = {
  /* ── Colors ── */
  color: {
    /** Primary text */
    textPrimary: '#1A1A1A',
    /** Secondary text */
    textSecondary: '#6B7280',
    /** Muted text */
    textMuted: '#999999',
    /** Accent blue (kept from v0.4) */
    accent: '#4A90D9',
    /** Danger red */
    danger: '#E25C5C',
    /** Success green */
    success: '#2E7D32',

    /** Page background */
    bg: '#FAFAFA',
    /** Surface (cards, panels) */
    surface: '#FFFFFF',
    /** Hover highlight */
    hover: '#F5F5F5',

    /** Border default */
    border: '#E5E5E5',
    /** Border light */
    borderLight: '#EEEEEE',
    /** Border input */
    borderInput: '#D0D0D0',
    /** Border active/focus */
    borderActive: '#4A90D9',
  },

  /* ── Shadows ── */
  shadow: {
    /** Subtle shadow for cards/menus (replaces 1px border) */
    sm: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    /** Medium shadow (hover state, floating panels) */
    md: '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
    /** Large shadow (modals, dropdowns) */
    lg: '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
  },

  /* ── Border Radius ── */
  radius: {
    /** Small (buttons, inputs) */
    sm: 4,
    /** Medium (cards, menus) */
    md: 8,
    /** Large (modals, panels) */
    lg: 10,
    /** Full (avatars) */
    full: '50%',
  },

  /* ── Spacing ── */
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },

  /* ── Typography ── */
  font: {
    /** UI font stack */
    ui: 'Inter, system-ui, -apple-system, sans-serif',
    /** Journal/handwriting font */
    journal: '"LXGW WenKai", "Caveat", cursive, sans-serif',
    /** Mono for code */
    mono: '"JetBrains Mono", "Fira Code", monospace',

    /** Font sizes */
    size: {
      xs: 10,
      sm: 11,
      base: 12,
      md: 13,
      lg: 14,
      xl: 16,
      xxl: 22,
    },
  },

  /* ── Transitions ── */
  transition: {
    /** Fast (button hover, menu items) */
    fast: '0.12s ease',
    /** Normal (panel slides, card hover) */
    normal: '0.2s ease',
    /** Slow (modals, overlays) */
    slow: '0.3s ease',
  },
} as const;

export type Tokens = typeof tokens;
