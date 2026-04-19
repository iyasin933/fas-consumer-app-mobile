import type { PropsWithChildren } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { io, type Socket } from 'socket.io-client';

import { setLoadQuotesSubscriptionSubscriber } from '@/features/delivery/socket/loadQuotesSubscriptionBridge';
import { useLoadQuotesStore } from '@/features/delivery/store/loadQuotesStore';
import * as tokenStorage from '@/services/tokenStorage';
import { env } from '@/shared/config/env';
import { useAuthStore } from '@/store/authStore';
import type { AuthUserProfile } from '@/types/auth.types';
import { debugLog } from '@/utils/debugLog';

function readUserId(user: AuthUserProfile | null): number | null {
  if (!user || typeof user !== 'object') return null;
  const id = (user as Record<string, unknown>).id;
  if (typeof id === 'number' && Number.isFinite(id)) return id;
  if (typeof id === 'string') {
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

type LoadQuotesSocketContextValue = {
  /** True when the underlying Socket.IO client is connected. */
  isConnected: boolean;
  /** Subscribe to server pushes for this load (TEG / DropYou load id as string). */
  subscribeToLoad: (loadId: string) => void;
  /** Stop receiving updates for this load (local + optional server leave). */
  unsubscribeFromLoad: (loadId: string) => void;
};

const LoadQuotesSocketContext = createContext<LoadQuotesSocketContextValue>({
  isConnected: false,
  subscribeToLoad: () => {},
  unsubscribeFromLoad: () => {},
});

export function useLoadQuotesSocket(): LoadQuotesSocketContextValue {
  return useContext(LoadQuotesSocketContext);
}

/**
 * Socket.IO client scoped to **load quotes only** (no chat).
 *
 * - Connects when the user is authed, `EXPO_PUBLIC_SOCKET_URL` is set, and a token exists.
 * - On connect: `join_user`, `joinNotifications` (legacy parity), then re-`subscribe_to_load` for any ids you registered while disconnected.
 * - Listens: `dropyou_quote_received`, `teg_quotes` → `useLoadQuotesStore.getState().ingestQuote`.
 *
 * @see env `EXPO_PUBLIC_SOCKET_URL` / `EXPO_PUBLIC_SOCKET_PATH` — API origin without `/api/v1`; path defaults to `/socket.io`.
 */
export function LoadQuotesSocketProvider({ children }: PropsWithChildren) {
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const userId = readUserId(user);

  const socketRef = useRef<Socket | null>(null);
  const subscribedLoadsRef = useRef<Set<string>>(new Set());
  const [connected, setConnected] = useState(false);

  const attachQuoteListeners = useCallback((socket: Socket) => {
    const logPayload = (event: string, data: unknown) => {
      if (!__DEV__) return;
      try {
        console.log(`[LoadQuotesSocket] ← ${event}`, JSON.stringify(data, null, 2));
      } catch {
        console.log(`[LoadQuotesSocket] ← ${event}`, data);
      }
    };

    const onDropyou = (data: unknown) => {
      logPayload('dropyou_quote_received', data);
      useLoadQuotesStore.getState().ingestQuote(data, 'dropyou_quote_received');
    };
    const onTeg = (data: unknown) => {
      logPayload('teg_quotes', data);
      useLoadQuotesStore.getState().ingestQuote(data, 'teg_quotes');
    };
    socket.on('dropyou_quote_received', onDropyou);
    socket.on('teg_quotes', onTeg);
    return () => {
      socket.off('dropyou_quote_received', onDropyou);
      socket.off('teg_quotes', onTeg);
    };
  }, []);

  const emitJoinRooms = useCallback((socket: Socket, uid: number) => {
    socket.emit('join_user', { userId: uid });
    socket.emit('joinNotifications', { userId: uid });
  }, []);

  const resubscribeAllLoads = useCallback((socket: Socket) => {
    for (const loadId of subscribedLoadsRef.current) {
      if (__DEV__) {
        console.log('[LoadQuotesSocket] emit subscribe_to_load (after connect / reconnect)', { loadId });
      }
      socket.emit('subscribe_to_load', { loadId });
    }
  }, []);

  useEffect(() => {
    const baseUrl = env.socketUrl;
    const rawPath = env.socketPath || '/socket.io';
    const socketPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    if (session !== 'authed' || userId == null || !baseUrl) {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      if (session === 'guest') {
        useLoadQuotesStore.getState().reset();
        subscribedLoadsRef.current.clear();
      }
      return;
    }

    let detachQuoteListeners: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const token = await tokenStorage.getAccessToken();
      if (cancelled || !token) {
        if (!token && __DEV__) debugLog('LoadQuotesSocket', 'No access token; socket not started');
        return;
      }

      const socket = io(baseUrl, {
        path: socketPath,
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: 8,
        reconnectionDelay: 1200,
        auth: { token },
        extraHeaders: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) {
        socket.removeAllListeners();
        socket.disconnect();
        return;
      }
      socketRef.current = socket;

      detachQuoteListeners = attachQuoteListeners(socket);

      socket.on('connect', () => {
        if (__DEV__) {
          console.log('[LoadQuotesSocket] connected', {
            socketId: socket.id,
            url: baseUrl,
            pendingLoadSubscriptions: [...subscribedLoadsRef.current],
          });
        }
        debugLog('LoadQuotesSocket', 'connected');
        setConnected(true);
        emitJoinRooms(socket, userId);
        if (__DEV__) {
          console.log('[LoadQuotesSocket] emit join_user', { userId });
          console.log('[LoadQuotesSocket] emit joinNotifications', { userId });
        }
        resubscribeAllLoads(socket);
      });

      socket.on('disconnect', (reason) => {
        if (__DEV__) {
          console.log('[LoadQuotesSocket] disconnected', { reason });
        }
        debugLog('LoadQuotesSocket', 'disconnect', reason);
        setConnected(false);
      });

      socket.on('connect_error', (err: Error & { description?: string; type?: string; data?: unknown }) => {
        if (__DEV__) {
          console.warn('[LoadQuotesSocket] connect_error', {
            message: err?.message,
            description: err?.description,
            type: err?.type,
            url: baseUrl,
            path: socketPath,
          });
        }
        debugLog('LoadQuotesSocket', 'connect_error', err?.message ?? err);
      });
    })();

    return () => {
      cancelled = true;
      detachQuoteListeners?.();
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
    };
  }, [session, userId, attachQuoteListeners, emitJoinRooms, resubscribeAllLoads]);

  const subscribeToLoad = useCallback((loadId: string) => {
    const id = String(loadId).trim();
    if (!id) return;
    subscribedLoadsRef.current.add(id);
    const s = socketRef.current;
    if (s?.connected) {
      if (__DEV__) {
        console.log('[LoadQuotesSocket] emit subscribe_to_load', { loadId: id });
      }
      s.emit('subscribe_to_load', { loadId: id });
    } else if (__DEV__) {
      console.log('[LoadQuotesSocket] subscribe_to_load queued (socket not connected yet)', {
        loadId: id,
        hint: 'Will emit on connect with join_user + pending subscriptions',
      });
    }
  }, []);

  /** Same as `subscribeToLoad` — registered so `createDropyouLoad` can subscribe before navigation. */
  useEffect(() => {
    setLoadQuotesSubscriptionSubscriber(subscribeToLoad);
    return () => setLoadQuotesSubscriptionSubscriber(null);
  }, [subscribeToLoad]);

  const unsubscribeFromLoad = useCallback((loadId: string) => {
    const id = String(loadId).trim();
    if (!id) return;
    subscribedLoadsRef.current.delete(id);
    const s = socketRef.current;
    if (s?.connected) {
      if (__DEV__) {
        console.log('[LoadQuotesSocket] emit unsubscribe_from_load', { loadId: id });
      }
      s.emit('unsubscribe_from_load', { loadId: id });
    }
  }, []);

  const value = useMemo<LoadQuotesSocketContextValue>(
    () => ({
      isConnected: connected,
      subscribeToLoad,
      unsubscribeFromLoad,
    }),
    [connected, subscribeToLoad, unsubscribeFromLoad],
  );

  return <LoadQuotesSocketContext.Provider value={value}>{children}</LoadQuotesSocketContext.Provider>;
}
