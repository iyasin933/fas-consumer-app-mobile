import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  FadeInRight,
  LinearTransition,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KikiChatInput } from '@/features/kiki/components/KikiChatInput';
import { KikiChatMessage } from '@/features/kiki/components/KikiChatMessage';
import { KikiQuoteCard } from '@/features/kiki/components/KikiQuoteCard';
import { KikiSidebar } from '@/features/kiki/components/KikiSidebar';
import { KikiWelcomeView } from '@/features/kiki/components/KikiWelcomeView';
import { fetchLoadDetailsById, fetchQuotesByLoadId } from '@/api/modules/dropyou.api';
import { useHomeProfile } from '@/features/home/hooks/useHomeProfile';
import { useKikiChatStream } from '@/features/kiki/hooks/useKikiChatStream';
import { useKikiQuotesSocket } from '@/features/kiki/hooks/useKikiQuotesSocket';
import {
  kikiMessagesKey,
  useCreateKikiSession,
  useKikiMessages,
  useKikiSession,
  useUpdateKikiSession,
} from '@/features/kiki/hooks/useKikiSessions';
import { useKikiChatStore } from '@/features/kiki/store/kikiChatStore';
import type { KikiMessage, KikiQuote } from '@/features/kiki/types';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { AccountRequiredEmptyState } from '@/shared/components/AccountRequiredEmptyState';
import { captureSafe } from '@/services/posthog';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/types/navigation.types';

const KIKI_LOGO = require('../../../../assets/images/kikidropYou.svg');
const EMPTY_MESSAGES: KikiMessage[] = [];
const EMPTY_QUOTES: KikiQuote[] = [];

function createStyles(colors: ThemeColors, narrow: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    keyboardAvoider: {
      flex: 1,
    },
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
    headerLogo: {
      width: narrow ? 160 : 200,
      height: narrow ? 50 : 63,
      alignSelf: 'center',
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    headerMetaBtn: {
      alignSelf: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: 999,
      backgroundColor: colors.primary + '18',
      borderWidth: 1,
      borderColor: colors.primary + '55',
      minHeight: 30,
    },
    headerMetaBtnText: {
      color: colors.primary,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.bold,
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
    actionDock: {
      marginHorizontal: narrow ? spacing.sm : spacing.md,
      marginTop: spacing.xs,
      marginBottom: narrow ? spacing.xs : spacing.sm,
      borderRadius: narrow ? 18 : 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    utilityRow: {
      minHeight: narrow ? 42 : 46,
      paddingHorizontal: narrow ? spacing.sm : spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    utilityStatus: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    utilityStatusText: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: narrow ? typography.fontSize.xs : typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
    },
    detailsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: spacing.xs,
      paddingLeft: spacing.sm,
    },
    detailsButtonText: {
      color: colors.primary,
      fontSize: narrow ? typography.fontSize.xs : typography.fontSize.sm,
      fontWeight: typography.fontWeight.bold,
    },
    dockDivider: {
      height: StyleSheet.hairlineWidth,
      marginHorizontal: narrow ? spacing.sm : spacing.md,
      backgroundColor: colors.border,
    },
    composerWrap: {
      paddingHorizontal: narrow ? spacing.sm : spacing.md,
      paddingTop: narrow ? spacing.xs : spacing.sm,
      paddingBottom: narrow ? spacing.xs : spacing.sm,
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
      paddingVertical: spacing.xs,
      gap: spacing.sm,
    },
    quoteTrayHeader: {
      minHeight: 40,
      paddingHorizontal: narrow ? spacing.sm : spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    quoteTrayTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    quoteTrayTitle: {
      color: colors.textPrimary,
      fontSize: narrow ? typography.fontSize.xs : typography.fontSize.sm,
      fontWeight: typography.fontWeight.bold,
    },
    quoteCountBadge: {
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary + '20',
    },
    quoteCountText: {
      color: colors.primary,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.bold,
    },
    quoteTrayAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: spacing.xs,
    },
    quoteTrayActionText: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
    },
    quoteList: {
      maxHeight: narrow ? 280 : 320,
      flexGrow: 0,
    },
    quoteSlide: {
      width: narrow ? 310 : 340,
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
    findingBanner: {
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    findingBannerText: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: narrow ? typography.fontSize.xs : typography.fontSize.sm,
      fontWeight: typography.fontWeight.bold,
    },
  });
}

export function KikiChatScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const isFocused = useIsFocused();
  const { width } = useWindowDimensions();
  const narrow = width < 380;
  const styles = useMemo(() => createStyles(colors, narrow), [colors, narrow]);
  const listRef = useRef<FlatList<KikiMessage> | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [quoteCaptionIndex, setQuoteCaptionIndex] = useState(0);
  const [quoteLoaderVisible, setQuoteLoaderVisible] = useState(false);
  const [quotesExpanded, setQuotesExpanded] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const { avatarUrl, initials } = useHomeProfile();
  const queryClient = useQueryClient();

  const session = useAuthStore((s) => s.session);
  const isAuthed = session === 'authed';

  const showChat = useKikiChatStore((s) => s.showChat);
  const initialMessage = useKikiChatStore((s) => s.initialMessage);
  const pendingGuestMessage = useKikiChatStore((s) => s.pendingGuestMessage);
  const activeConversationKey = useKikiChatStore(
    (s) => s.activeConversationKey,
  );
  const currentSessionId = useKikiChatStore((s) => s.currentSessionId);
  const conversation = useKikiChatStore((s) =>
    s.activeConversationKey
      ? s.conversations[s.activeConversationKey]
      : undefined,
  );
  const messages = conversation?.messages ?? EMPTY_MESSAGES;
  const status = conversation?.status ?? 'idle';
  const messagesLoading = conversation?.messagesLoading ?? false;
  const quotes = conversation?.quotes ?? EMPTY_QUOTES;
  const currentLoadId = conversation?.currentLoadId ?? null;
  const resolvedBookingUuid = conversation?.bookingId ?? null;
  const quotesLoading = conversation?.quotesLoading ?? false;
  const draft = conversation?.draft ?? '';
  const startChat = useKikiChatStore((s) => s.startChat);
  const clearInitialMessage = useKikiChatStore((s) => s.clearInitialMessage);
  const newChat = useKikiChatStore((s) => s.newChat);
  const setMessages = useKikiChatStore((s) => s.setMessages);
  const migrateConversation = useKikiChatStore((s) => s.migrateConversation);
  const setDraft = useKikiChatStore((s) => s.setDraft);
  const setMessagesLoading = useKikiChatStore((s) => s.setMessagesLoading);
  const setQuotesLoading = useKikiChatStore((s) => s.setQuotesLoading);
  const setBookingIdentity = useKikiChatStore((s) => s.setBookingIdentity);
  const setPendingGuestMessage = useKikiChatStore((s) => s.setPendingGuestMessage);

  const { send } = useKikiChatStream(activeConversationKey);
  const createSessionMutation = useCreateKikiSession();
  const updateSessionMutation = useUpdateKikiSession();
  const { data: sessionData } = useKikiSession(currentSessionId);
  const {
    data: messagesData,
    isFetching: isMessagesFetching,
  } = useKikiMessages(currentSessionId);

  const activeBookingId = useMemo(() => {
    const bookingMessage = [...messages]
      .reverse()
      .find(
        (message) =>
          message.role === 'assistant' &&
          typeof message.content === 'string' &&
          message.content.includes('Your booking has been created successfully'),
      );
    const content = bookingMessage?.content ?? '';
    const normalizedContent = content.replace(/\*\*/g, '');
    const match = normalizedContent.match(/Booking ID:\s*([A-Za-z0-9-]+)/i);

    if (match?.[1]) return match[1].trim();

    const metadata = bookingMessage?.metadata as Record<string, unknown> | undefined;
    const bookingId =
      metadata?.bookingId ??
      metadata?.booking_id ??
      metadata?.loadId ??
      metadata?.load_id;
    return bookingId != null && String(bookingId).trim() ? String(bookingId).trim() : '';
  }, [messages]);

  const subscriptionLoadId = useMemo(() => {
    if (currentLoadId != null) return currentLoadId;
    const parsed = Number(activeBookingId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [activeBookingId, currentLoadId]);

  const sortedQuotes = useMemo(() => {
    const timestamp = (quote: KikiQuote): number => {
      const source = (quote.quote ?? quote) as Record<string, unknown>;
      const raw =
        quote.eventTime ??
        source.eventTime ??
        source.createdOn ??
        source.created_on ??
        (quote as Record<string, unknown>).recordCreatedAt;
      const parsed = typeof raw === 'string' ? Date.parse(raw) : Number(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    return [...quotes].sort((a, b) => timestamp(b) - timestamp(a));
  }, [quotes]);

  useEffect(() => {
    setQuotesExpanded(true);
  }, [activeConversationKey]);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (
      !isFocused ||
      !showChat ||
      !activeConversationKey ||
      currentLoadId != null ||
      !activeBookingId
    ) {
      return;
    }

    let cancelled = false;
    const ownerKey = activeConversationKey;
    const controller = new AbortController();

    void (async () => {
      try {
        if (__DEV__) {
          console.log('[KikiChat] resolving load details from booking id', activeBookingId);
        }
        const response = await fetchLoadDetailsById(
          activeBookingId,
          controller.signal,
        );
        console.log('[KikiChat] load details response', response);
        if (cancelled) return;


        const root = response as Record<string, unknown> | undefined;
        const result =
          (root?.result as Record<string, unknown> | undefined) ??
          (root?.data as Record<string, unknown> | undefined) ??
          root;
        const bookingRecord =
          result?.booking && typeof result.booking === 'object'
            ? (result.booking as Record<string, unknown>)
            : undefined;
        const candidate =
          result?.loadId ??
          result?.load_id ??
          result?.id ??
          result?.bookingId ??
          result?.booking_id;
        const bookingUuid =
          bookingRecord?.id ??
          bookingRecord?.bookingId ??
          bookingRecord?.booking_id ??
          result?.bookingId ??
          result?.booking_id;
        if (bookingUuid != null && String(bookingUuid).trim()) {
          const uuid = String(bookingUuid).trim();
          if (__DEV__) {
            console.log('[KikiChat] resolved booking uuid from load details', uuid);
          }
          setBookingIdentity(ownerKey, { bookingId: uuid });
        }
        const numeric = Number(candidate);
        if (Number.isFinite(numeric) && numeric > 0) {
          if (__DEV__) {
            console.log('[KikiChat] resolved load id from booking details', numeric);
          }
          setBookingIdentity(ownerKey, { loadId: numeric });
        }
      } catch (err: unknown) {
        if (__DEV__) {
          console.warn('[KikiChat] failed to resolve load details from booking id', err);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    activeBookingId,
    activeConversationKey,
    currentLoadId,
    isFocused,
    setBookingIdentity,
    showChat,
  ]);

  // Socket for real-time quotes
  useKikiQuotesSocket(activeConversationKey, subscriptionLoadId);

  // Fetch existing quotes by load ID on mount / when loadId appears
  const hydrateQuotesFromMessages = useCallback((
    conversationKey: string,
    history: KikiMessage[],
  ) => {
    const store = useKikiChatStore.getState();
    for (const message of history) {
      const metadata = message.metadata as Record<string, unknown> | undefined;
      const quote = metadata?.quote as KikiQuote | undefined;
      if (metadata?.type === 'quote_received' && quote) {
        store.upsertQuote(conversationKey, quote);
      }
    }
  }, []);
  useEffect(() => {
    if (
      !isFocused ||
      !showChat ||
      !activeConversationKey ||
      !subscriptionLoadId
    ) {
      return;
    }
    let cancelled = false;
    const ownerKey = activeConversationKey;
    const controller = new AbortController();
    setQuotesLoading(ownerKey, true);

    void (async () => {
      try {
        if (__DEV__) {
          console.log('[KikiChat] fetching quotes for loadId', subscriptionLoadId);
        }
        const rows = await fetchQuotesByLoadId(
          subscriptionLoadId,
          controller.signal,
        );
        if (cancelled) return;

        if (__DEV__) {
          console.log('[KikiChat] quotes response', {
            count: Array.isArray(rows) ? rows.length : 'not an array',
            sample:
              Array.isArray(rows) && rows.length > 0
                ? String((rows[0] as any)?.quoteId ?? '')
                : null,
          });
        }

        if (!Array.isArray(rows) || rows.length === 0) return;
        const store = useKikiChatStore.getState();
        for (const row of rows) {
          if (cancelled) break;
          store.upsertQuote(
            ownerKey,
            row as import('@/features/kiki/types').KikiQuote,
          );
        }
        if (__DEV__) {
          console.log(
            '[KikiChat] quotes upserted',
            useKikiChatStore.getState().conversations[ownerKey]?.quotes.length ?? 0,
          );
        }
      } catch (err: unknown) {
        if (__DEV__) {
          console.warn('[KikiChat] fetchQuotesByLoadId failed', err);
        }
      } finally {
        if (!cancelled) setQuotesLoading(ownerKey, false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      setQuotesLoading(ownerKey, false);
    };
  }, [
    activeConversationKey,
    isFocused,
    setQuotesLoading,
    showChat,
    subscriptionLoadId,
  ]);

  // Load historical messages when session is loaded
  useEffect(() => {
    if (!currentSessionId || !activeConversationKey) return;
    const ownerKey = activeConversationKey;
    setMessagesLoading(ownerKey, isMessagesFetching);

    const serverMessages = messagesData?.data;
    const wouldRegressLocalConversation =
      serverMessages != null && serverMessages.length < messages.length;
    if (
      serverMessages &&
      status !== 'streaming' &&
      !wouldRegressLocalConversation
    ) {
      const history = [...serverMessages];
      const sorted = history
        .filter((message) => {
          const metadata = message.metadata as Record<string, unknown> | undefined;
          const isQuoteMarker = metadata?.type === 'quote_received';
          const isSyntheticQuoteMessage =
            typeof message.content === 'string' &&
            message.content.startsWith('Quote received from ');
          return !isQuoteMarker && !isSyntheticQuoteMessage;
        })
        .sort((a, b) => {
          const seqA = (a as unknown as Record<string, unknown>).sequenceNumber as number;
          const seqB = (b as unknown as Record<string, unknown>).sequenceNumber as number;
          return (seqA ?? 0) - (seqB ?? 0);
        });
      setMessages(ownerKey, sorted, messagesData.meta);
      hydrateQuotesFromMessages(ownerKey, history);
    }
  }, [
    activeConversationKey,
    currentSessionId,
    hydrateQuotesFromMessages,
    messagesData,
    isMessagesFetching,
    messages.length,
    status,
    setMessages,
    setMessagesLoading,
  ]);

  useEffect(() => {
    if (!currentSessionId) return;
    const key = kikiMessagesKey(currentSessionId);
    return () => {
      void queryClient.cancelQueries({ queryKey: key, exact: true });
    };
  }, [currentSessionId, queryClient]);

  const handleSendMessage = useCallback(
    async (text: string) => {
      const draftConversationKey = activeConversationKey;
      if (draftConversationKey) {
        setDraft(draftConversationKey, '');
      }

      // Guest users: save message locally, then show sign-in prompt
      if (!isAuthed) {
        setPendingGuestMessage(text);
        captureSafe('kiki_guest_send_attempt', { messageLength: text.length });
        return;
      }

      let sessionId = currentSessionId;
      let conversationKey = activeConversationKey;

      if (!conversationKey) {
        conversationKey = startChat();
      }

      if (!sessionId) {
        try {
          const title = text.slice(0, 40);
          const result = await createSessionMutation.mutateAsync({ title });
          if (result.data?.id) {
            sessionId = result.data.id;
            migrateConversation(conversationKey, sessionId);
            conversationKey = sessionId;
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

      void send(text, conversationKey, sessionId);
    },
    [
      isAuthed,
      setPendingGuestMessage,
      currentSessionId,
      activeConversationKey,
      setDraft,
      startChat,
      createSessionMutation,
      migrateConversation,
      send,
      sessionData,
      updateSessionMutation,
    ],
  );

  // Fire pending guest message after login
  useEffect(() => {
    if (isAuthed && pendingGuestMessage) {
      const messageToSend = pendingGuestMessage;
      setPendingGuestMessage(null);
      // Small delay so store updates settle before sending
      const timer = setTimeout(() => {
        void handleSendMessage(messageToSend);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isAuthed, pendingGuestMessage, handleSendMessage, setPendingGuestMessage]);

  // Handle initial message from quick actions
  useEffect(() => {
    if (initialMessage && showChat && messages.length === 0) {
      const messageToSend = initialMessage;
      clearInitialMessage();
      void handleSendMessage(messageToSend);
    }
  }, [initialMessage, showChat, messages.length, clearInitialMessage, handleSendMessage]);

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

  const handleViewDetailsByLoadId = useCallback(
    (loadId: string) => {
      if (!loadId) return;
      navigation.navigate('BookingDetails', {
        loadId,
        backTitle: 'Kiki',
      });
    },
    [navigation],
  );

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const isLoading = status === 'streaming';
  const quoteRequestInProgress =
    isFocused &&
    showChat &&
    subscriptionLoadId != null &&
    quotesLoading;
  const quoteCaptions = useMemo(
    () => [
      'Finding drivers near your area...',
      'Searching available drivers...',
      'Comparing driver prices...',
      'Matching drivers to your requirements...',
    ],
    [],
  );

  useEffect(() => {
    if (!quoteRequestInProgress) {
      setQuoteLoaderVisible(false);
      return;
    }

    const timer = setTimeout(() => setQuoteLoaderVisible(true), 150);
    return () => clearTimeout(timer);
  }, [quoteRequestInProgress]);

  useEffect(() => {
    if (subscriptionLoadId == null) {
      setQuoteCaptionIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setQuoteCaptionIndex((current) => (current + 1) % quoteCaptions.length);
    }, 1800);

    return () => clearInterval(timer);
  }, [quoteCaptions.length, subscriptionLoadId]);

  const renderMessage = useCallback(
    ({ item }: { item: KikiMessage }) => {
      if (!item.content) return null;
      return (
        <KikiChatMessage
          text={item.content}
          sender={item.role === 'user' ? 'user' : 'bot'}
          userAvatarUrl={avatarUrl}
          userInitials={initials}
        />
      );
    },
    [avatarUrl, initials],
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
        <View style={styles.headerCenter}>
          <Image
            source={KIKI_LOGO}
            style={styles.headerLogo}
            resizeMode="contain"
            accessibilityLabel="Kiki — Your Booking Agent"
          />
        </View>
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
        <KeyboardAvoidingView
          style={styles.keyboardAvoider}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* Messages */}
          <FlatList
            key={activeConversationKey}
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            ListEmptyComponent={
              messagesLoading ? (
                <View style={styles.findingWrap}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.findingText}>Loading conversation...</Text>
                </View>
              ) : null
            }
          />
          {sortedQuotes.length > 0 ? (
            <View>
              <Pressable
                style={styles.quoteTrayHeader}
                onPress={() => setQuotesExpanded((expanded) => !expanded)}
                accessibilityRole="button"
                accessibilityState={{ expanded: quotesExpanded }}
                accessibilityLabel={`${quotesExpanded ? 'Hide' : 'Show'} ${sortedQuotes.length} driver quotes`}
              >
                <View style={styles.quoteTrayTitleWrap}>
                  <Ionicons
                    name="pricetags-outline"
                    size={17}
                    color={colors.primary}
                  />
                  <Text style={styles.quoteTrayTitle}>Driver quotes</Text>
                  <View style={styles.quoteCountBadge}>
                    <Text style={styles.quoteCountText}>
                      {sortedQuotes.length}
                    </Text>
                  </View>
                </View>
                <View style={styles.quoteTrayAction}>
                  <Text style={styles.quoteTrayActionText}>
                    {quotesExpanded ? 'Hide' : 'Show'}
                  </Text>
                  <Ionicons
                    name={quotesExpanded ? 'chevron-down' : 'chevron-up'}
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
              </Pressable>
              {quotesExpanded && !keyboardVisible ? (
                <FlatList
                  data={sortedQuotes}
                  horizontal
                  style={styles.quoteList}
                  contentContainerStyle={styles.quoteWrap}
                  keyExtractor={(quote, index) =>
                    String(
                      quote.quoteId ??
                        quote.quote?.quoteId ??
                        `quote-${activeConversationKey}-${index}`,
                    )
                  }
                  renderItem={({ item, index }) => (
                    <Animated.View
                      style={styles.quoteSlide}
                      entering={
                        index === 0
                          ? FadeInRight.duration(280)
                              .springify()
                              .damping(14)
                              .stiffness(140)
                          : undefined
                      }
                      layout={LinearTransition.springify().damping(18)}
                    >
                      <KikiQuoteCard
                        conversationKey={activeConversationKey!}
                        quote={item}
                        fallbackBookingId={resolvedBookingUuid || null}
                        fallbackLoadId={subscriptionLoadId}
                      />
                    </Animated.View>
                  )}
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  accessibilityLabel="Driver quotes, newest first"
                  snapToAlignment="start"
                  decelerationRate="fast"
                />
              ) : null}
            </View>
          ) : null}
          <View style={styles.actionDock}>
            {subscriptionLoadId != null || activeBookingId ? (
              <>
                <View style={styles.utilityRow}>
                  {subscriptionLoadId != null ? (
                    <View style={styles.utilityStatus}>
                      {quoteLoaderVisible ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Ionicons
                          name="radio"
                          size={18}
                          color={colors.primary}
                        />
                      )}
                      <Text style={styles.utilityStatusText} numberOfLines={1}>
                        {quoteCaptions[quoteCaptionIndex]}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.utilityStatus} />
                  )}
                  {activeBookingId ? (
                    <Pressable
                      onPress={() => handleViewDetailsByLoadId(activeBookingId)}
                      style={styles.detailsButton}
                      accessibilityRole="button"
                      accessibilityLabel="View booking details"
                      hitSlop={8}
                    >
                      <Text style={styles.detailsButtonText}>Booking details</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={colors.primary}
                      />
                    </Pressable>
                  ) : null}
                </View>
                <View style={styles.dockDivider} />
              </>
            ) : null}

            <View style={styles.composerWrap}>
              <KikiChatInput
                onSend={handleSendMessage}
                placeholder="Message Kiki..."
                disabled={isLoading}
                value={draft}
                onChangeText={(text) => {
                  if (activeConversationKey) {
                    setDraft(activeConversationKey, text);
                  }
                }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
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
