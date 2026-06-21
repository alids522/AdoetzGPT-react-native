import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import {
  useFonts,
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from '@expo-google-fonts/hanken-grotesk';

import RootNavigator from './src/navigation/RootNavigator';
import { useAppStore } from './src/state/store';
import { useAppTheme } from './src/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Global default font — mirrors GoogleFonts.hankenGroteskTextTheme applied app-wide.
type TextWithDefaults = typeof Text & { defaultProps?: { style?: unknown } };
(Text as unknown as TextWithDefaults).defaultProps = {
  ...((Text as unknown as TextWithDefaults).defaultProps ?? {}),
  style: { fontFamily: 'HankenGrotesk_400Regular' },
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
  });
  const initialized = useAppStore((s) => s.initialized);
  const isDark = useAppStore((s) => s.theme === 'dark');
  const { palette: p } = useAppTheme();

  useEffect(() => {
    void useAppStore.getState().initialize();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
          {initialized ? (
            <RootNavigator />
          ) : (
            <View style={[styles.loading, { backgroundColor: p.background }]}>
              <ActivityIndicator size="large" color={p.primary} />
            </View>
          )}
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
