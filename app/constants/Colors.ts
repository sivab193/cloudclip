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

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

const light: ThemeTokens = {
  background: '#ffffff',
  surface: '#ffffff',
  surfaceAlt: '#f0f0f0',
  surfaceDisabled: '#e6e8ea',

  text: '#11181C',
  textMuted: '#666666',
  textDisabled: '#4a5568',
  placeholder: '#999999',

  border: '#11181C',
  borderSubtle: '#eeeeee',

  primary: '#000000',
  onPrimary: '#ffffff',
  danger: '#b00020',
  onDanger: '#ffffff',
  accent: '#1a7f37',

  icon: '#11181C',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: '#000000',

  tint: tintColorLight,
  tabIconDefault: '#687076',
  tabIconSelected: tintColorLight,
};

const dark: ThemeTokens = {
  background: '#151718',
  surface: '#1e2022',
  surfaceAlt: '#26292b',
  surfaceDisabled: '#2b2f31',

  text: '#ECEDEE',
  textMuted: '#9BA1A6',
  textDisabled: '#8a9296',
  placeholder: '#6b7175',

  border: '#3a3f42',
  borderSubtle: '#2a2e30',

  // Inverted: a light fill with dark text reads as "primary" on a dark page.
  primary: '#ECEDEE',
  onPrimary: '#151718',
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
