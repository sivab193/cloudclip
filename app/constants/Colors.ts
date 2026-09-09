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
  /** Text/icons on top of `primary`. */
  onPrimary: string;
  /** Destructive action fill and error text. */
  danger: string;
  /** Text/icons on top of `danger`. */
  onDanger: string;
  /** Positive highlight (e.g. "this device"). */
  accent: string;

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

const tintColorLight = '#6850d8';
const tintColorDark = '#b9a8ff';

const light: ThemeTokens = {
  background: '#f8f9fc',
  surface: '#ffffff',
  surfaceAlt: '#efedf9',
  surfaceDisabled: '#e6e8ea',

  text: '#202039',
  textMuted: '#6a6a80',
  textDisabled: '#4a5568',
  placeholder: '#77778c',

  border: '#d8d8e7',
  borderSubtle: '#e6e5ef',

  primary: '#6850d8',
  onPrimary: '#ffffff',
  danger: '#b00020',
  onDanger: '#ffffff',
  accent: '#1a7f37',

  icon: '#57516e',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: '#000000',

  tint: tintColorLight,
  tabIconDefault: '#687076',
  tabIconSelected: tintColorLight,
};

const dark: ThemeTokens = {
  background: '#12121d',
  surface: '#1c1c2b',
  surfaceAlt: '#252338',
  surfaceDisabled: '#2b2f31',

  text: '#ECEDEE',
  textMuted: '#9BA1A6',
  textDisabled: '#8a9296',
  placeholder: '#6b7175',

  border: '#45405d',
  borderSubtle: '#302d44',

  // Inverted: a light fill with dark text reads as "primary" on a dark page.
  primary: '#b9a8ff',
  onPrimary: '#19132f',
  // #b00020 fails contrast on a dark surface; this is the lightened pair.
  danger: '#ff6b6b',
  onDanger: '#151718',
  accent: '#3fb950',

  icon: '#ECEDEE',
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: '#000000',

  tint: tintColorDark,
  tabIconDefault: '#9BA1A6',
  tabIconSelected: tintColorDark,
};

export const Colors = { light, dark };

export type ColorSchemeName = keyof typeof Colors;
