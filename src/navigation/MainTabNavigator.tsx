import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { BookingsScreen } from '@/features/bookings/screens/BookingsScreen';
import { HomeBottomNavigation } from '@/features/home/components/HomeBottomNavigation';
import { HomeDashboardScreen } from '@/features/home/screens/HomeDashboardScreen';
import { MapScreen } from '@/features/map/screens/MapScreen';
import { NotificationsScreen } from '@/features/notifications/screens/NotificationsScreen';
import { SettingsScreen } from '@/features/settings/screens/SettingsScreen';
import { useTheme } from '@/hooks/useTheme';
import { createDefaultTabHeaderOptions } from '@/navigation/headerOptions';
import type { MainTabParamList } from '@/types/navigation.types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      initialRouteName="HomeMain"
      tabBar={(props) => <HomeBottomNavigation {...props} />}
      screenOptions={({ route }) => ({
        ...createDefaultTabHeaderOptions(colors),
        headerShown: route.name !== 'HomeMain' && route.name !== 'Map',
      })}
    >
      <Tab.Screen name="HomeMain" component={HomeDashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Bookings" component={BookingsScreen} options={{ title: 'Bookings' }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
