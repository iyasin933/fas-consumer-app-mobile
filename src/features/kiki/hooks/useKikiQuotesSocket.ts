import { useCallback, useEffect, useRef } from 'react';
import { Platform, Vibration } from 'react-native';
import { io, type Socket } from 'socket.io-client';

import type { KikiQuote } from '@/features/kiki/types';
import { useKikiChatStore } from '@/features/kiki/store/kikiChatStore';
import { env } from '@/shared/config/env';
import { getAccessToken } from '@/services/tokenStorage';
import { debugLog } from '@/utils/debugLog';

/**
 * Subscribe to real-time quotes for a specific load/booking via Socket.IO.
 * Mirrors the web app's `ChatWindow.tsx` socket integration.
 *
 * Usage:
 *   useKikiQuotesSocket(activeConversationKey, currentLoadId);
 *
 * Automatically connects when `loadId` is truthy and cleans up on unmount /
 * loadId change.
 */
export function useKikiQuotesSocket(
  conversationKey: string | null,
  loadId: number | null,
) {
  const socketRef = useRef<Socket | null>(null);
  const subscribedLoadIdsRef = useRef<Set<number>>(new Set());
  const alertedQuoteIdsRef = useRef<Set<string>>(new Set());
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      debugLog('KikiQuotesSocket', 'disconnecting', {
        socketId: socketRef.current.id,
      });
    }
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  useEffect(() => {
    const subscribedLoadIds = subscribedLoadIdsRef.current;
    if (!conversationKey || !loadId) {
      debugLog('KikiQuotesSocket', 'no verified load id; not subscribing');
      return;
    }
    if (subscribedLoadIds.has(loadId)) {
      debugLog('KikiQuotesSocket', 'load already subscribed', { loadId });
      return;
    }

    let cancelled = false;
    let socket: Socket | null = null;

    void (async () => {
      const token = await getAccessToken();
      if (cancelled) return;

      disconnect();
      subscribedLoadIds.add(loadId);
      debugLog('KikiQuotesSocket', 'creating socket', {
        loadId,
        url: env.socketUrl,
        path: env.socketPath,
        hasAccessToken: Boolean(token),
      });

      socket = io(env.socketUrl, {
        path: env.socketPath,
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: 8,
        reconnectionDelay: 1200,
        auth: token ? { token } : undefined,
        extraHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        debugLog('KikiQuotesSocket', 'connected', {
          socketId: socket?.id,
          loadId,
        });
        debugLog('KikiQuotesSocket', 'emit subscribe_to_load', { loadId });
        socket?.emit('subscribe_to_load', { loadId: String(loadId) });
      });

      socket.on('dropyou_quote_received', (data: unknown) => {
        debugLog('KikiQuotesSocket', 'received dropyou_quote_received', data);
        const payload = data as KikiQuote;
        const quoteLoadId = payload.quote?.loadId ?? payload.loadId;
        if (quoteLoadId != null && Number(quoteLoadId) === Number(loadId)) {
          const quoteId = payload.quote?.quoteId ?? payload.quoteId;
          const eventTimestamp =
            typeof (data as Record<string, unknown>)?.timestamp === 'string'
              ? String((data as Record<string, unknown>).timestamp)
              : new Date().toISOString();
          const normalizedQuote: KikiQuote = {
            ...payload,
            ...payload.quote,
            eventTime: eventTimestamp,
            raw: payload,
          };
          const alertKey =
            quoteId != null
              ? `${loadId}:${String(quoteId)}`
              : `${loadId}:${JSON.stringify(payload)}`;
          debugLog('KikiQuotesSocket', 'quote matched subscribed load', {
            loadId,
            quoteLoadId,
          });
          useKikiChatStore
            .getState()
            .upsertQuote(conversationKey, normalizedQuote);
          debugLog('KikiQuotesSocket', 'quote appended to conversation', {
            conversationKey,
            quoteId,
            quoteCount:
              useKikiChatStore.getState().conversations[conversationKey]?.quotes
                .length ?? 0,
            eventTime: eventTimestamp,
          });
          if (!alertedQuoteIdsRef.current.has(alertKey)) {
            alertedQuoteIdsRef.current.add(alertKey);
            Vibration.vibrate(
              Platform.OS === 'android' ? [0, 180, 100, 180] : undefined,
            );
            debugLog('KikiQuotesSocket', 'new quote alert', {
              loadId,
              quoteId,
              feedback: 'vibration + animated quote insert',
            });
          }
        } else {
          debugLog('KikiQuotesSocket', 'ignored quote for another load', {
            subscribedLoadId: loadId,
            quoteLoadId,
          });
        }
      });

      socket.on('disconnect', (reason) => {
        debugLog('KikiQuotesSocket', 'disconnected', { loadId, reason });
        useKikiChatStore.getState().stopFindingQuotes(conversationKey);
      });

      socket.on('connect_error', (error) => {
        debugLog('KikiQuotesSocket', 'connect_error', {
          loadId,
          message: error.message,
        });
      });
    })();

    return () => {
      cancelled = true;
      subscribedLoadIds.delete(loadId);
      disconnect();
    };
  }, [conversationKey, disconnect, loadId]);

  // Cleanup on unmount
  useEffect(() => {
    const subscribedLoadIds = subscribedLoadIdsRef.current;
    const alertedQuoteIds = alertedQuoteIdsRef.current;
    return () => {
      subscribedLoadIds.clear();
      alertedQuoteIds.clear();
      disconnect();
    };
  }, [disconnect]);
}
