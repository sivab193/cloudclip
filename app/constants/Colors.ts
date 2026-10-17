/**
 * Theme tokens for light and dark mode.
 *
 * Screens must not hardcode colour literals — pull from these tokens via
 * `useTheme()` so both schemes stay in sync. Token names describe ROLE
 * ("surface", "textMuted", "danger"), never appearance, so that the dark
 * values can invert without the names becoming lies.
 */

export interface ThemeTokens {
  /** Page background, behind everything. */
  background: string;
  /** Cards, panels, modals — sits on top of `background`. */
  surface: string;
  /** Subtle fills: list rows, wells. */
  surfaceAlt: string;
  /** Non-editable inputs. */
  surfaceDisabled: string;

  /** Primary body/heading text. */
  text: string;
  /** Secondary/supporting text. */
  textMuted: string;
  /** Text inside a disabled control. */
  textDisabled: string;
  /** Input placeholder text. */
  placeholder: string;

  /** Input outlines, visible dividers. */
  border: string;
  /** Hairline separators between rows. */
  borderSubtle: string;

  /** Primary action fill. */
  primary: string;
  primaryStrong: string;
  primarySoft: string;
  /** Text/icons on top of `primary`. */
  onPrimary: string;
  /** Destructive action fill and error text. */
  danger: string;
  /** Text/icons on top of `danger`. */
  onDanger: string;
  /** Positive highlight (e.g. "this device"). */
  accent: string;
  accentSoft: string;
  glass: string;

  /** Default icon colour. */
  icon: string;
  /** Modal scrim. */
  overlay: string;
  /** Shadow colour (shadows are near-invisible in dark mode by design). */
  shadow: string;

  tint: string;
  tabIconDefault: string;
  tabIconSelected: string;
}

const tintColorLight = '#5142a0';
const tintColorDark = '#b8adff';

const light: ThemeTokens = {
  background: '#f6f5f1',
  surface: '#ffffff',
  surfaceAlt: '#f0efe9',
  surfaceDisabled: '#e6e5df',

  text: '#1d2530',
  textMuted: '#56616d',
  textDisabled: '#6c757c',
  placeholder: '#67717a',

  border: '#cfd2d2',
  borderSubtle: '#e3e4df',

  primary: '#5142a0',
  primaryStrong: '#3e327f',
  primarySoft: '#ede9fb',
  onPrimary: '#ffffff',
  danger: '#b00020',
  onDanger: '#ffffff',
  accent: '#216b54',
  accentSoft: '#e5f3eb',
  glass: '#ffffff',

  icon: '#495463',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: '#000000',

  tint: tintColorLight,
  tabIconDefault: '#687076',
  tabIconSelected: tintColorLight,
};

const dark: ThemeTokens = {
  background: '#10151b',
  surface: '#1b222b',
  surfaceAlt: '#242d36',
  surfaceDisabled: '#303942',

  text: '#f0f2ef',
  textMuted: '#bac4ca',
  textDisabled: '#a6b0b6',
  placeholder: '#a4afb5',

  border: '#48525c',
  borderSubtle: '#36414b',

  // Inverted: a light fill with dark text reads as "primary" on a dark page.
  primary: '#b8adff',
  primaryStrong: '#b8adff',
  primarySoft: '#302d49',
  onPrimary: '#171b27',
  // #b00020 fails contrast on a dark surface; this is the lightened pair.
  danger: '#ff6b6b',
  onDanger: '#151718',
  accent: '#8bdbb2',
  accentSoft: '#20392f',
  glass: '#1b222b',

  icon: '#d4dadc',
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: '#000000',

  tint: tintColorDark,
  tabIconDefault: '#9BA1A6',
  tabIconSelected: tintColorDark,
};

export const Colors = { light, dark };

export type ColorSchemeName = keyof typeof Colors;
