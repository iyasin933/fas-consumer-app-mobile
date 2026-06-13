import { useCallback, useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

import type { KikiQuote } from '@/features/kiki/types';
import { useKikiChatStore } from '@/features/kiki/store/kikiChatStore';
import { env } from '@/shared/config/env';

/**
 * Subscribe to real-time quotes for a specific load/booking via Socket.IO.
 * Mirrors the web app's `ChatWindow.tsx` socket integration.
 *
 * Usage:
 *   useKikiQuotesSocket(currentLoadId);
 *
 * Automatically connects when `loadId` is truthy and cleans up on unmount /
 * loadId change.
 */
export function useKikiQuotesSocket(loadId: number | null) {
  const socketRef = useRef<Socket | null>(null);
  const subscribedLoadIdsRef = useRef<Set<number>>(new Set());
  const upsertQuote = useKikiChatStore((s) => s.upsertQuote);
  const stopFindingQuotes = useKikiChatStore((s) => s.stopFindingQuotes);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  useEffect(() => {
    if (!loadId) return;
    if (subscribedLoadIdsRef.current.has(loadId)) return;

    // Clean up any existing socket before creating a new one
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    subscribedLoadIdsRef.current.add(loadId);

    const socket = io(env.socketUrl, {
      path: env.socketPath,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // Subscribe to quotes for this load
      socket.emit('subscribe_to_load', { loadId });
    });

    socket.on('dropyou_quote_received', (data: unknown) => {
      const payload = data as KikiQuote;
      const quoteLoadId =
        payload.quote?.loadId ?? payload.loadId;
      if (
        quoteLoadId != null &&
        loadId != null &&
        Number(quoteLoadId) === Number(loadId)
      ) {
        upsertQuote(payload);
      }
    });

    socket.on('disconnect', () => {
      stopFindingQuotes();
    });

    socket.on('connect_error', () => {
      // Connection will retry automatically
    });

    return () => {
      subscribedLoadIdsRef.current.delete(loadId);
      disconnect();
    };
  }, [loadId, disconnect, upsertQuote, stopFindingQuotes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      subscribedLoadIdsRef.current.clear();
      disconnect();
    };
  }, [disconnect]);
}