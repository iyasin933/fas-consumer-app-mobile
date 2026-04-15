import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { BookingsScreen } from '@/features/bookings/screens/BookingsScreen';
import { HomeBottomNavigation } from '@/features/home/components/HomeBottomNavigation';
import { HomeDashboardScreen } from '@/features/home/screens/HomeDashboardScreen';
import { MapScreen } from '@/features/map/screens/MapScreen';
import { NotificationsScreen } from '@/features/notifications/screens/NotificationsScreen';
import { SettingsScreen } from '@/features/settings/screens/SettingsScreen';
import type { MainTabParamList } from '@/types/navigation.types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="HomeMain"
      tabBar={(props) => <HomeBottomNavigation {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeMain" component={HomeDashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
