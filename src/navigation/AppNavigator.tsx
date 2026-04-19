import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AddDeliveryContentsScreen } from '@/features/delivery/screens/AddDeliveryContentsScreen';
import { ChooseVehicleScreen } from '@/features/delivery/screens/ChooseVehicleScreen';
import { useTheme } from '@/hooks/useTheme';
import { MainTabNavigator } from '@/navigation/MainTabNavigator';
import { UsersScreen } from '@/screens/users/UsersScreen';
import type { AppStackParamList } from '@/types/navigation.types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: '600', color: colors.textPrimary },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="Users" component={UsersScreen} options={{ title: 'Users' }} />
      <Stack.Screen
        name="AddDeliveryContents"
        component={AddDeliveryContentsScreen}
        options={{ title: 'Add your contents' }}
      />
      <Stack.Screen name="ChooseVehicle" component={ChooseVehicleScreen} options={{ title: 'Choose vehicle' }} />
    </Stack.Navigator>
  );
}
