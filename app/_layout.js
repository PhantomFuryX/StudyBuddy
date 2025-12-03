import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { getToken } from '../utils/api';
import NotificationService from '../utils/NotificationService';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await NotificationService.init();
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="quiz" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="result" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="upload" options={{ headerShown: false, animation: 'slide_from_right' }} />
    </Stack>
  );
}
