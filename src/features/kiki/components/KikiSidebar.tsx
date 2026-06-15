import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  SlideInLeft,
  SlideOutLeft,
} from 'react-native-reanimated';

import {
  useKikiSessions,
  useDeleteKikiSession,
  kikiMessagesKey,
} from '@/features/kiki/hooks/useKikiSessions';
import { useKikiChatStore } from '@/features/kiki/store/kikiChatStore';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { AppStackParamList } from '@/types/navigation.types';

type Props = {
  visible: boolean;
  onClose: () => void;
  onNewChat: () => void;
};

function createStyles(colors: ThemeColors, narrow: boolean) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.3)',
      zIndex: 10,
    },
    panel: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: narrow ? 260 : 300,
      backgroundColor: colors.surface,
      zIndex: 11,
      paddingTop: narrow ? spacing.xl + spacing.md : spacing.xl * 2,
      paddingHorizontal: narrow ? spacing.sm : spacing.md,
      paddingBottom: spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    backBtn: {
      padding: spacing.xs,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: narrow ? spacing.md : spacing.lg,
    },
    profileAvatar: {
      width: narrow ? 38 : 44,
      height: narrow ? 38 : 44,
      borderRadius: narrow ? 19 : 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileAvatarText: {
      color: colors.onPrimary,
      fontWeight: '700',
      fontSize: narrow ? 14 : 16,
    },
    profileName: {
      fontSize: narrow ? typography.fontSize.sm : typography.fontSize.md,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    profileEmail: {
      fontSize: narrow ? typography.fontSize.xs : typography.fontSize.sm,
      color: colors.textSecondary,
    },
    newChatBtn: {
      minHeight: narrow ? 44 : 48,
      borderRadius: 999,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    newChatText: {
      color: colors.onPrimary,
      fontSize: narrow ? typography.fontSize.sm : typography.fontSize.md,
      fontWeight: '600',
    },
    sessionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: narrow ? spacing.xs : spacing.sm,
      paddingVertical: narrow ? spacing.xs + 2 : spacing.sm,
      paddingHorizontal: narrow ? spacing.sm : spacing.md,
      borderRadius: 999,
      marginBottom: spacing.xs,
    },
    sessionRowActive: {
      backgroundColor: colors.primary,
    },
    sessionTextWrap: {
      flex: 1,
    },
    sessionTitle: {
      fontSize: narrow ? typography.fontSize.xs : typography.fontSize.sm,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    sessionTitleActive: {
      color: colors.onPrimary,
    },
    sessionDate: {
      fontSize: narrow ? typography.fontSize.xs : typography.fontSize.sm,
      color: colors.textSecondary,
    },
    sessionDateActive: {
      color: colors.onPrimary + 'CC',
    },
    deleteBtn: {
      padding: spacing.xs,
    },
    emptyWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: spacing.xl * 3,
    },
    emptyIcon: {
      marginBottom: spacing.sm,
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: narrow ? typography.fontSize.xs : typography.fontSize.sm,
      textAlign: 'center',
      lineHeight: narrow ? 18 : 22,
    },
    list: {
      flex: 1,
    },
    guestWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    guestText: {
      color: colors.textSecondary,
      fontSize: narrow ? typography.fontSize.sm : typography.fontSize.md,
      textAlign: 'center',
    },
  });
}

function coerceStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;

  const numericValue =
    typeof value === 'number'
      ? value
      : value.trim() && Number.isFinite(Number(value))
        ? Number(value)
        : null;
  const timestamp =
    numericValue == null
      ? new Date(value).getTime()
      : numericValue < 1_000_000_000_000
        ? numericValue * 1000
        : numericValue;

  if (!Number.isFinite(timestamp)) return null;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Relative time for recent sessions, calendar date and time for older ones. */
function formatSessionDate(value: unknown): string {
  const date = parseDate(value);
  if (!date) return '';

  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec >= 0 && diffSec < 60) return 'just now';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin >= 0 && diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr >= 0 && diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay >= 0 && diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function KikiSidebar({ visible, onClose, onNewChat }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const narrow = width < 380;
  const styles = useMemo(() => createStyles(colors, narrow), [colors, narrow]);
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const currentSessionId = useKikiChatStore((s) => s.currentSessionId);
  const setSession = useKikiChatStore((s) => s.setSession);
  const removeConversation = useKikiChatStore((s) => s.removeConversation);

  const isAuthed = session === 'authed';

  // Only fetch sessions when authenticated
  const { data: sessionsData, isLoading } = useKikiSessions();
  const deleteMutation = useDeleteKikiSession();
  const sessions = isAuthed ? (sessionsData?.data ?? []) : [];

  const userRecord = user as Record<string, unknown> | null;
  const firstName = coerceStr(userRecord?.firstName);
  const lastName = coerceStr(userRecord?.lastName);
  const email = coerceStr(userRecord?.email);
  const initials = firstName.slice(0, 2).toUpperCase() || 'U';
  const displayName =
    firstName || lastName ? `${firstName} ${lastName}`.trim() : 'User';

  const handleSessionSelect = (sessionId: string) => {
    if (currentSessionId && currentSessionId !== sessionId) {
      void queryClient.cancelQueries({
        queryKey: kikiMessagesKey(currentSessionId),
        exact: true,
      });
    }
    setSession(sessionId);
    onClose();
  };

  const handleDelete = (sessionId: string) => {
    Alert.alert('Delete Session', 'Are you sure you want to delete this chat?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteMutation.mutate(sessionId, {
            onSuccess: () => removeConversation(sessionId),
          });
          if (currentSessionId === sessionId) {
            onNewChat();
          }
        },
      },
    ]);
  };

  const truncate = (title: string, max = 25) =>
    title.length > max ? title.slice(0, max) + '...' : title;

  if (!visible) return null;

  return (
    <>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View />
      </Pressable>
      <Animated.View entering={SlideInLeft} exiting={SlideOutLeft} style={styles.panel}>
        <View style={styles.header}>
          <Pressable
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={narrow ? 20 : 22} color={colors.textPrimary} />
          </Pressable>
          <Pressable onPress={onClose} accessibilityLabel="Close sidebar">
            <Ionicons name="close" size={narrow ? 20 : 22} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{initials}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{displayName}</Text>
            {email ? <Text style={styles.profileEmail}>{email}</Text> : null}
          </View>
        </View>

        {isAuthed && (
          <Pressable
            style={styles.newChatBtn}
            onPress={onNewChat}
            accessibilityRole="button"
            accessibilityLabel="New chat"
          >
            <Ionicons name="add-circle-outline" size={narrow ? 18 : 20} color={colors.onPrimary} />
            <Text style={styles.newChatText}>New Chat</Text>
          </Pressable>
        )}

        {!isAuthed ? (
          <View style={styles.guestWrap}>
            <Ionicons
              name="person-circle-outline"
              size={narrow ? 34 : 40}
              color={colors.textSecondary}
              style={styles.emptyIcon}
            />
            <Text style={styles.guestText}>
              Sign in to view your chat history
            </Text>
          </View>
        ) : isLoading ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Loading sessions...</Text>
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons
              name="chatbubbles-outline"
              size={narrow ? 34 : 40}
              color={colors.textSecondary}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyText}>No chat sessions yet</Text>
            <Text style={[styles.emptyText, { marginTop: 4 }]}>
              Start a new chat to begin
            </Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            style={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isActive = item.id === currentSessionId;
              return (
                <Pressable
                  style={[
                    styles.sessionRow,
                    isActive && styles.sessionRowActive,
                  ]}
                  onPress={() => handleSessionSelect(item.id)}
                  onLongPress={() => handleDelete(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={item.title || 'Chat session'}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={narrow ? 16 : 18}
                    color={isActive ? colors.onPrimary : colors.textSecondary}
                  />
                  <View style={styles.sessionTextWrap}>
                    <Text
                      style={[
                        styles.sessionTitle,
                        isActive && styles.sessionTitleActive,
                      ]}
                      numberOfLines={1}
                    >
                      {truncate(item.title || 'New Chat')}
                    </Text>
                    <Text
                      style={[
                        styles.sessionDate,
                        isActive && styles.sessionDateActive,
                      ]}
                    >
                      {formatSessionDate(item.createdAt)}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item.id)}
                    accessibilityLabel="Delete session"
                  >
                    <Ionicons
                      name="trash-outline"
                      size={narrow ? 14 : 16}
                      color={isActive ? colors.onPrimary : colors.danger}
                    />
                  </Pressable>
                </Pressable>
              );
            }}
          />
        )}
      </Animated.View>
    </>
  );
}
