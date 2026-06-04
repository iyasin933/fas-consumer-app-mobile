import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { BookingDetailsScreen } from '@/features/bookings/screens/BookingDetailsScreen';
import { ForgotPasswordScreen } from '@/features/auth/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '@/features/auth/screens/ResetPasswordScreen';
import { SignInScreen } from '@/features/auth/screens/SignInScreen';
import { SignUpScreen } from '@/features/auth/screens/SignUpScreen';
import { SignUpVerifyScreen } from '@/features/auth/screens/SignUpVerifyScreen';
import { AddDeliveryContentsScreen } from '@/features/delivery/screens/AddDeliveryContentsScreen';
import { ChooseQuotesScreen } from '@/features/delivery/screens/ChooseQuotesScreen';
import { ChooseVehicleScreen } from '@/features/delivery/screens/ChooseVehicleScreen';
import { DeliveryPaymentScreen } from '@/features/delivery/screens/DeliveryPaymentScreen';
import { DeliveryTrackingScreen } from '@/features/delivery/screens/DeliveryTrackingScreen';
import { RecipientDetailsScreen } from '@/features/delivery/screens/RecipientDetailsScreen';
import { useTheme } from '@/hooks/useTheme';
import { createDefaultStackHeaderOptions } from '@/navigation/headerOptions';
import { MainTabNavigator } from '@/navigation/MainTabNavigator';
import { UsersScreen } from '@/screens/users/UsersScreen';
import type { RootStackParamList } from '@/types/navigation.types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={createDefaultStackHeaderOptions(colors)}
    >
      <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false, title: 'Home' }} />
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
      <Stack.Screen
        name="Users"
        component={UsersScreen}
        options={{ title: 'Users', headerBackTitle: 'Profile' }}
      />
      <Stack.Screen
        name="BookingDetails"
        component={BookingDetailsScreen}
        options={({ route }) => ({
          title: 'Booking details',
          headerBackTitle: route.params?.backTitle ?? 'Bookings',
        })}
      />
      <Stack.Screen
        name="AddDeliveryContents"
        component={AddDeliveryContentsScreen}
        options={{ title: 'Add your contents', headerBackTitle: 'Map' }}
      />
      <Stack.Screen
        name="RecipientDetails"
        component={RecipientDetailsScreen}
        options={{ title: 'Recipient details', headerBackTitle: 'Contents' }}
      />
      <Stack.Screen
        name="ChooseVehicle"
        component={ChooseVehicleScreen}
        options={{ title: 'Choose vehicle', headerBackTitle: 'Recipient' }}
      />
      <Stack.Screen
        name="ChooseQuotes"
        component={ChooseQuotesScreen}
        options={({ navigation }) => ({
          title: 'Quotes',
          headerBackVisible: false,
          headerBackTitle: 'Home',
          gestureEnabled: false,
          headerLeft: () => (
            <Pressable
              onPress={() =>
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainTabs', params: { screen: 'HomeMain' } }],
                })
              }
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Back to home"
              style={headerBackStyles.button}
            >
              <Ionicons name="chevron-back" size={30} color={colors.textPrimary} />
              <Text style={[headerBackStyles.text, { color: colors.textPrimary }]}>Home</Text>
            </Pressable>
          ),
        })}
      />
      <Stack.Screen
        name="DeliveryPayment"
        component={DeliveryPaymentScreen}
        options={({ route }) => ({
          title: 'Pay',
          headerBackTitle: route.params?.backTitle ?? 'Quotes',
        })}
      />
      <Stack.Screen
        name="DeliveryTracking"
        component={DeliveryTrackingScreen}
        options={({ route }) => ({
          title: 'Tracking',
          headerBackTitle: route.params?.backTitle ?? 'Payment',
        })}
      />
    </Stack.Navigator>
  );
}

const headerBackStyles = StyleSheet.create({
  button: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -8,
  },
  text: {
    fontSize: 17,
    fontWeight: '400',
    marginLeft: -4,
  },
});
