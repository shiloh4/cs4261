import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import { initNotificationsAsync } from '@/lib/notifications';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AnalysisProvider } from '@/context/AnalysisContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AnalysisProvider>
          <InitOnce />
          <Stack>
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
                // Provide a friendly back label for screens pushed from tabs
                title: 'Back',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="result"
              options={{
                title: 'Results',
                headerBackTitle: 'Back',
                headerBackTitleVisible: true,
              }}
            />
            <Stack.Screen name="+not-found" />
          </Stack>
        </AnalysisProvider>
        <StatusBar style="auto" />
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

function InitOnce() {
  useEffect(() => {
    initNotificationsAsync();
  }, []);
  return null;
}
