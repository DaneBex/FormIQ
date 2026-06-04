import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useUserStore } from '@/store/userStore';
import { useSubscription } from '@/subscription/useSubscription';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const user = useUserStore((s) => s.user);
  const { isSubscribed } = useSubscription();

  useEffect(() => {
    const inAuth = segments[0] === '(auth)';

    if (!user && !inAuth) {
      router.replace('/(auth)/login');
      return;
    }

    if (user && !isSubscribed && (segments as string[])[1] !== 'paywall') {
      router.replace('/(auth)/paywall');
      return;
    }

    if (user && isSubscribed && inAuth) {
      router.replace('/(tabs)');
    }
  }, [user, isSubscribed, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
