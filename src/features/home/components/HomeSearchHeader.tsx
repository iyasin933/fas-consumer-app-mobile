import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useHomeProfile } from '@/features/home/hooks/useHomeProfile';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { AppStackParamList, MainTabParamList } from '@/types/navigation.types';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    search: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
    },
    searchKikiIcon: {
      width: 22,
      height: 22,
    },
    searchText: {
      fontSize: typography.fontSize.md,
      color: colors.muted,
    },
    searchCursor: {
      fontSize: typography.fontSize.md,
      color: colors.primary,
      fontWeight: '700',
    },
    avatar: { marginLeft: 2 },
    avatarInner: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarText: {
      color: colors.onPrimary,
      fontWeight: typography.fontWeight.bold,
      fontSize: 16,
    },
  });
}

const PLACEHOLDERS = [
  'Ask Kiki to book a delivery...',
  'Track your parcel with Kiki...',
  'How can I help you today?',
  'Need delivery tips? Ask Kiki...',
  'Find the nearest drop point...',
];

const POST_TYPING_PAUSE_MS = 2000;
const TYPING_SPEED_MS = 60;
const ERASING_SPEED_MS = 30;

type TypePhase = 'typing' | 'pausing' | 'erasing';

type Props = {
  onOpenWhereTo: () => void;
  resolving: boolean;
};

/**
 * Home “Where to?” bar. Parent screen owns the full-screen Places overlay so
 * it can render **last** above ScrollView / tab chrome (z-index + order).
 */
export function HomeSearchHeader({ onOpenWhereTo, resolving }: Props) {
  const { avatarUrl, initials, signOut } = useHomeProfile();
  const { colors } = useTheme();
  const tabNavigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const phaseRef = useRef<TypePhase>('typing');
  const charIndexRef = useRef(0);

  const advance = useCallback(() => {
    const fullText = PLACEHOLDERS[placeholderIndex] ?? '';
    const phase = phaseRef.current;

    if (phase === 'typing') {
      if (charIndexRef.current < fullText.length) {
        charIndexRef.current += 1;
        setDisplayedText(fullText.slice(0, charIndexRef.current));
        return TYPING_SPEED_MS;
      }
      phaseRef.current = 'pausing';
      return POST_TYPING_PAUSE_MS;
    }

    if (phase === 'pausing') {
      phaseRef.current = 'erasing';
      return ERASING_SPEED_MS;
    }

    if (phase === 'erasing') {
      if (charIndexRef.current > 0) {
        charIndexRef.current -= 1;
        setDisplayedText(fullText.slice(0, charIndexRef.current));
        return ERASING_SPEED_MS;
      }
      phaseRef.current = 'typing';
      charIndexRef.current = 0;
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
      return TYPING_SPEED_MS;
    }

    return TYPING_SPEED_MS;
  }, [placeholderIndex]);

  useEffect(() => {
    charIndexRef.current = 0;
    phaseRef.current = 'typing';
    setDisplayedText('');

    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      const delay = advance();
      timeoutId = setTimeout(tick, delay);
    };

    const startDelay = setTimeout(() => {
      tick();
    }, 300);

    return () => {
      clearTimeout(startDelay);
      clearTimeout(timeoutId!);
    };
  }, [placeholderIndex, advance]);

  return (
    <View style={styles.row}>
      <Pressable
        style={styles.search}
        onPress={() => navigation.navigate('KikiChat')}
        accessibilityRole="button"
        accessibilityLabel="Ask Kiki"
        disabled={resolving}
      >
        <Image
          source={require('../../../../assets/images/kiki.png')}
          style={styles.searchKikiIcon}
          resizeMode="contain"
        />
        <View style={{ flexDirection: 'row', flex: 1 }}>
          <Text style={styles.searchText} numberOfLines={1}>
            {displayedText}
          </Text>
          <Text style={styles.searchCursor}>|</Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel="Open profile"
        accessibilityRole="button"
        onPress={() => tabNavigation.navigate('Settings')}
        onLongPress={() => void signOut()}
        style={styles.avatar}
        hitSlop={8}
      >
        <View style={styles.avatarInner}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Text style={styles.avatarText} numberOfLines={1}>
              {initials}
            </Text>
          )}
        </View>
      </Pressable>
    </View>
  );
}
