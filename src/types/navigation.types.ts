export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ResetPassword: { phone: string };
  SignUpVerify: { phone: string };
};

/** Bottom tabs inside the signed-in area (see `MainTabNavigator`). */
export type MainTabParamList = {
  HomeMain: undefined;
  Bookings: undefined;
  Map: undefined;
  Notifications: undefined;
  Settings: undefined;
};

export type AppStackParamList = {
  MainTabs: undefined;
  Users: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends AuthStackParamList, AppStackParamList {}
  }
}
