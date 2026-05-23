import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ForgotPasswordScreen } from '@/features/auth/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '@/features/auth/screens/ResetPasswordScreen';
import { SignInScreen } from '@/features/auth/screens/SignInScreen';
import { SignUpScreen } from '@/features/auth/screens/SignUpScreen';
import { SignUpVerifyScreen } from '@/features/auth/screens/SignUpVerifyScreen';
import { useTheme } from '@/hooks/useTheme';
import { createDefaultStackHeaderOptions } from '@/navigation/headerOptions';
import type { AuthStackParamList } from '@/types/navigation.types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      initialRouteName="SignIn"
      screenOptions={createDefaultStackHeaderOptions(colors)}
    >
      <Stack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ title: 'Create account', headerBackTitle: 'Sign in' }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: 'Forgot password', headerBackTitle: 'Sign in' }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ title: 'Set new password', headerBackTitle: 'Forgot' }}
      />
      <Stack.Screen
        name="SignUpVerify"
        component={SignUpVerifyScreen}
        options={{ title: 'Verify account', headerBackTitle: 'Create account' }}
      />
    </Stack.Navigator>
  );
}
