import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KikiChatInput } from '@/features/kiki/components/KikiChatInput';
import { KikiChatMessage } from '@/features/kiki/components/KikiChatMessage';
import { KikiQuoteCard } from '@/features/kiki/components/KikiQuoteCard';
import { KikiSidebar } from '@/features/kiki/components/KikiSidebar';
import { KikiWelcomeView } from '@/features/kiki/components/KikiWelcomeView';
import { useKikiChatStream } from '@/features/kiki/hooks/useKikiChatStream';
import { useKikiQuotesSocket } from '@/features/kiki/hooks/useKikiQuotesSocket';
import {
  useCreateKikiSession,
  useKikiMessages,
  useKikiSession,
  useUpdateKikiSession,
} from '@/features/kiki/hooks/useKikiSessions';
import { useKikiChatStore } from '@/features/kiki/store/kikiChatStore';
import type { KikiMessage } from '@/features/kiki/types';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { AccountRequiredEmptyState } from '@/shared/components/AccountRequiredEmptyState';
import { captureSafe } from '@/services/posthog';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

function createStyles(colors: ThemeColors, narrow: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: narrow ? spacing.sm : spacing.md,
      paddingVertical: narrow ? spacing.xs : spacing.sm,
      gap: narrow ? spacing.xs : spacing.sm,
    },
    headerLeft: {
      width: narrow ? 44 : 48,
    },
    headerTitle: {
      flex: 1,
      fontSize: narrow ? typography.fontSize.md : typography.fontSize.lg,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    iconBtn: {
      width: narrow ? 44 : 48,
      height: narrow ? 44 : 48,
      borderRadius: narrow ? 22 : 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    list: {
      flex: 1,
      paddingHorizontal: narrow ? spacing.sm : spacing.md,
    },
    listContent: {
      paddingBottom: spacing.md,
    },
    footer: {
      paddingHorizontal: narrow ? spacing.sm : spacing.md,
      paddingVertical: narrow ? spacing.xs : spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    thinkingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    thinkingText: {
      fontSize: narrow ? typography.fontSize.xs : typography.fontSize.sm,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    errorWrap: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    errorText: {
      fontSize: narrow ? typography.fontSize.xs : typography.fontSize.sm,
      color: colors.danger,
      textAlign: 'center',
    },
    quoteWrap: {
      paddingHorizontal: narrow ? spacing.sm : spacing.md,
      paddingBottom: spacing.md,
    },
    findingWrap: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
    },
    findingText: {
      color: colors.textSecondary,
      fontSize: narrow ? typography.fontSize.xs : typography.fontSize.sm,
      marginTop: spacing.sm,
    },
  });
}

export function KikiChatScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const narrow = width < 380;
  const styles = useMemo(() => createStyles(colors, narrow), [colors, narrow]);
  const listRef = useRef<FlatList<KikiMessage> | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const session = useAuthStore((s) => s.session);
  const isAuthed = session === 'authed';

  const showChat = useKikiChatStore((s) => s.showChat);
  const initialMessage = useKikiChatStore((s) => s.initialMessage);
  const pendingGuestMessage = useKikiChatStore((s) => s.pendingGuestMessage);
  const currentSessionId = useKikiChatStore((s) => s.currentSessionId);
  const messages = useKikiChatStore((s) => s.messages);
  const status = useKikiChatStore((s) => s.status);
  const error = useKikiChatStore((s) => s.error);
  const quotes = useKikiChatStore((s) => s.quotes);
  const isFindingQuotes = useKikiChatStore((s) => s.isFindingQuotes);
  const currentLoadId = useKikiChatStore((s) => s.currentLoadId);
  const startChat = useKikiChatStore((s) => s.startChat);
  const newChat = useKikiChatStore((s) => s.newChat);
  const setMessages = useKikiChatStore((s) => s.setMessages);
  const setSession = useKikiChatStore((s) => s.setSession);
  const setPendingGuestMessage = useKikiChatStore((s) => s.setPendingGuestMessage);

  const { send } = useKikiChatStream();
  const createSessionMutation = useCreateKikiSession();
  const updateSessionMutation = useUpdateKikiSession();
  const { data: sessionData } = useKikiSession(currentSessionId);
  const { data: messagesData } = useKikiMessages(currentSessionId);

  // Socket for real-time quotes
  useKikiQuotesSocket(currentLoadId);

  // Load historical messages when session is loaded
  useEffect(() => {
    if (currentSessionId && messagesData?.data && messagesData.data.length > 0) {
      const sorted = [...messagesData.data].sort((a, b) => {
        const seqA = (a as unknown as Record<string, unknown>).sequenceNumber as number;
        const seqB = (b as unknown as Record<string, unknown>).sequenceNumber as number;
        return (seqA ?? 0) - (seqB ?? 0);
      });
      if (sorted.length > 0) {
        setMessages(sorted);
      }
    }
  }, [currentSessionId, messagesData, setMessages]);

  const handleSendMessage = useCallback(
    async (text: string) => {
      // Guest users: save message locally, then show sign-in prompt
      if (!isAuthed) {
        setPendingGuestMessage(text);
        startChat(text);
        captureSafe('kiki_guest_send_attempt', { messageLength: text.length });
        return;
      }

      let sessionId = currentSessionId;

      if (!sessionId) {
        try {
          const title = text.slice(0, 40);
          const result = await createSessionMutation.mutateAsync({ title });
          if (result.data?.id) {
            sessionId = result.data.id;
            setSession(sessionId);
          }
        } catch {
          return;
        }
      } else {
        if (sessionData?.data && !sessionData.data.title) {
          updateSessionMutation.mutate({
            id: sessionId,
            payload: { title: text.slice(0, 40) },
          });
        }
      }

      void send(text);
    },
    [
      isAuthed,
      setPendingGuestMessage,
      startChat,
      currentSessionId,
      createSessionMutation,
      setSession,
      send,
      sessionData,
      updateSessionMutation,
    ],
  );

  // Fire pending guest message after login
  useEffect(() => {
    if (isAuthed && pendingGuestMessage) {
      setPendingGuestMessage(null);
      // Small delay so store updates settle before sending
      const timer = setTimeout(() => {
        void handleSendMessage(pendingGuestMessage);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isAuthed, pendingGuestMessage, handleSendMessage, setPendingGuestMessage]);

  // Handle initial message from quick actions
  useEffect(() => {
    if (initialMessage && showChat && messages.length === 0) {
      void handleSendMessage(initialMessage);
    }
  }, [initialMessage, showChat, messages.length, handleSendMessage]);

  const handleStartChat = useCallback(
    (message: string) => {
      startChat(message);
    },
    [startChat],
  );

  const handleNewChat = useCallback(() => {
    newChat();
    setSidebarVisible(false);
  }, [newChat]);

  // Detect booking success and start quote flow
  useEffect(() => {
    for (const msg of messages) {
      if (msg.role === 'assistant') {
        const content = msg.content || '';
        if (
          content.includes(
            '🎉 Perfect! Your booking has been created successfully!',
          )
        ) {
          const match = content.match(/\*\*Booking ID:\*\*\s*(\d+)/);
          if (match && match[1]) {
            const loadId = parseInt(match[1], 10);
            if (loadId && currentLoadId !== loadId) {
              useKikiChatStore.getState().startFindingQuotes(loadId);
            }
          }
        }
      }
    }
  }, [messages, currentLoadId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const isLoading = status === 'streaming';

  const renderMessage = useCallback(
    ({ item }: { item: KikiMessage }) => {
      if (!item.content) return null;
      return (
        <KikiChatMessage
          text={item.content}
          sender={item.role === 'user' ? 'user' : 'bot'}
        />
      );
    },
    [],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => setSidebarVisible(true)}
          accessibilityLabel="Open chat history"
        >
          <Ionicons name="menu" size={narrow ? 20 : 22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Kiki — Your Booking Agent</Text>
        {/* Right spacer to keep title centered */}
        <View style={styles.headerLeft} />
      </View>

      {/* Welcome, Guest prompt, or Chat */}
      {!isAuthed && pendingGuestMessage ? (
        /* Guest typed a message — show sign-in prompt */
        <AccountRequiredEmptyState
          title="Sign in to send your message"
          body="We've saved your message. Sign in and it will be sent to Kiki automatically."
          icon="chatbubbles-outline"
        />
      ) : !showChat ? (
        /* Welcome view (both guest and authed users see this initially) */
        <KikiWelcomeView onStartChat={handleStartChat} />
      ) : (
        <>
          {/* Messages */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              <>
                {isLoading && (
                  <View style={styles.thinkingRow}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.thinkingText}>
                      Kiki is thinking...
                    </Text>
                  </View>
                )}

                {error ? (
                  <View style={styles.errorWrap}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {isFindingQuotes && quotes.length === 0 ? (
                  <View style={styles.findingWrap}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.findingText}>
                      Finding the best quote for you...
                    </Text>
                  </View>
                ) : null}

                {quotes.length > 0 ? (
                  <View style={styles.quoteWrap}>
                    {quotes.map((q, i) => (
                      <KikiQuoteCard
                        key={
                          (q.quoteId as string) ??
                          (q.quote?.quoteId as string) ??
                          `quote-${i}`
                        }
                        quote={q}
                      />
                    ))}
                  </View>
                ) : null}
              </>
            }
          />

          {/* Input */}
          <View style={styles.footer}>
            <KikiChatInput
              onSend={handleSendMessage}
              disabled={isLoading}
              placeholder="Ask Kiki..."
            />
          </View>
        </>
      )}

      {/* Sidebar */}
      <KikiSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        onNewChat={handleNewChat}
      />
    </SafeAreaView>
  );
}