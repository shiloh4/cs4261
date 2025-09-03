/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

// Indigo/Cyan theme
const tintColorLight = '#6366F1'; // indigo-500
const tintColorDark = '#A78BFA'; // violet-400

export const Colors = {
  light: {
    text: '#11181C',
    background: '#f7f8fd',
    tint: tintColorLight,
    icon: '#64748b',
    tabIconDefault: '#94a3b8',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#0b0f1a',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#64748b',
    tabIconSelected: tintColorDark,
  },
};
