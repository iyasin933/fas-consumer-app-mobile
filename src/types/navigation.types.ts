import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ResetPassword: { phone: string };
  SignUpVerify: { phone: string };
};

/**
 * Lightweight coords for passing a picked place through navigation.
 * Full shape (including `placeId`) is kept in the delivery zustand store.
 */
export type MapScreenPickedPlace = {
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
};

/** Bottom tabs inside the signed-in area (see `MainTabNavigator`). */
export type MainTabParamList = {
  HomeMain: undefined;
  Bookings: undefined;
  Map:
    | {
        /** Pre-fill the Dropoff field from the Home search bar. */
        initialDropoff?: MapScreenPickedPlace;
        /** Snap index (0=35%, 1=65%, 2=95%). Default 1 when arriving from Home. */
        initialSnapIndex?: 0 | 1 | 2;
      }
    | undefined;
  Notifications: undefined;
  Settings: undefined;
};

export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Users: undefined;
  AddDeliveryContents: undefined;
  ChooseVehicle: undefined;
};

/** Use on the Map tab to push stack screens registered on `AppNavigator`. */
export type MapTabScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Map'>,
  NativeStackNavigationProp<AppStackParamList>
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends AuthStackParamList, AppStackParamList {}
  }
}
