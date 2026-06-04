import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, type ComponentProps } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { InteractiveEmptyState } from '@/shared/components/InteractiveEmptyState';
import type { RootStackParamList } from '@/types/navigation.types';

type Props = {
  eyebrow?: string;
  title: string;
  body: string;
  icon?: ComponentProps<typeof InteractiveEmptyState>['icon'];
  style?: StyleProp<ViewStyle>;
};

export function AccountRequiredEmptyState({
  eyebrow = 'Account required',
  title,
  body,
  icon = 'person-circle-outline',
  style,
}: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const openSignIn = useCallback(() => {
    navigation.navigate('SignIn');
  }, [navigation]);

  return (
    <InteractiveEmptyState
      eyebrow={eyebrow}
      title={title}
      body={body}
      icon={icon}
      primaryAction={{
        label: 'Sign in',
        icon: 'log-in-outline',
        onPress: openSignIn,
      }}
      style={style}
    />
  );
}
