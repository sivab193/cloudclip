import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, ThemeTokens, ColorSchemeName } from '@/constants/Colors';

/**
 * The active theme's tokens. Use this instead of hardcoding colours.
 *
 * Styles that depend on the theme can't live in a module-level
 * `StyleSheet.create`, so pair this with `useThemedStyles`:
 *
 *   const styles = useThemedStyles(makeStyles);
 *   const t = useTheme();   // for props like `color=` on icons
 */
export function useTheme(): ThemeTokens {
  const scheme = useColorScheme();
  const name: ColorSchemeName = scheme === 'dark' ? 'dark' : 'light';
  return Colors[name];
}

export function useColorSchemeName(): ColorSchemeName {
  const scheme = useColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}

/**
 * Builds a StyleSheet from the active tokens, rebuilding only when the theme
 * flips. `factory` must be a stable module-level function.
 */
export function useThemedStyles<T>(factory: (t: ThemeTokens) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
