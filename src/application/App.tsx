import { useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StripeProvider } from '@stripe/stripe-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashScreen } from '@/features/splash/screens/AnimatedSplashScreen';
import { useTheme } from '@/hooks/useTheme';
import { RootNavigator } from '@/navigation/RootNavigator';
import { AuthHydration } from '@/providers/AuthHydration';
import { QueryProvider } from '@/providers/QueryProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { env } from '@/shared/config/env';

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export function AppRoot() {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  const tree = (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryProvider>
          <AuthHydration>
            <ThemedStatusBar />
            {showSplash ? (
              <AnimatedSplashScreen onAnimationComplete={handleSplashComplete} />
            ) : (
              <RootNavigator />
            )}
          </AuthHydration>
        </QueryProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {env.stripePublishableKey ? (
        <StripeProvider publishableKey={env.stripePublishableKey} urlScheme="dropyou">
          {tree}
        </StripeProvider>
      ) : (
        tree
      )}
    </GestureHandlerRootView>
  );
}
