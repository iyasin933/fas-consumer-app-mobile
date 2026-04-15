import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ForgotPasswordScreen } from '@/features/auth/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '@/features/auth/screens/ResetPasswordScreen';
import { SignInScreen } from '@/features/auth/screens/SignInScreen';
import { SignUpScreen } from '@/features/auth/screens/SignUpScreen';
import { SignUpVerifyScreen } from '@/features/auth/screens/SignUpVerifyScreen';
import { useTheme } from '@/hooks/useTheme';
import type { AuthStackParamList } from '@/types/navigation.types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      initialRouteName="SignIn"
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontWeight: '600', color: colors.textPrimary },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ title: 'Create account' }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: 'Forgot password' }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ title: 'Set new password' }}
      />
      <Stack.Screen
        name="SignUpVerify"
        component={SignUpVerifyScreen}
        options={{ title: 'Verify phone' }}
      />
    </Stack.Navigator>
  );
}
