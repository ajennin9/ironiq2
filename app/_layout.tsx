import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize);

  // Initialize auth listener on app start
  useEffect(() => {
    initialize();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
