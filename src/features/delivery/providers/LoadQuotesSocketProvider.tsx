import type { PropsWithChildren } from 'react';
import {
  Platform,
  Vibration,
} from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';

import { setLoadQuotesSubscriptionSubscriber } from '@/features/delivery/socket/loadQuotesSubscriptionBridge';
import { useLoadQuotesStore } from '@/features/delivery/store/loadQuotesStore';
import * as tokenStorage from '@/services/tokenStorage';
import { env } from '@/shared/config/env';
import { useAuthStore } from '@/store/authStore';
import type { AuthUserProfile } from '@/types/auth.types';
import { debugLog } from '@/utils/debugLog';
import { queryKeys } from '@/utils/queryKeys';

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
  subscribeToVehicle: (vehicleId: string) => void;
  unsubscribeFromVehicle: (vehicleId: string) => void;
  vehicleLocations: Record<string, VehicleLocation>;
};

type VehicleLocation = {
  vehicleId: string;
  location: {
    lat: number;
    lng: number;
  };
  address?: string;
  timestamp?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function numberFrom(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function stringFrom(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function normalizeVehicleLocation(data: unknown): VehicleLocation | null {
  const envelope = asRecord(data);
  const raw = asRecord(envelope?.result) ?? asRecord(envelope?.data) ?? envelope;
  if (!raw) return null;

  const location = asRecord(raw.location) ?? asRecord(raw.currentLocation);
  const vehicleId = stringFrom(
    raw.vehicleId ??
      raw.vehicle_id ??
      raw.id ??
      raw.executorVehicleId ??
      raw.executor_vehicle_id,
  );
  const lat = numberFrom(
    location?.lat ??
      location?.latitude ??
      raw.lat ??
      raw.latitude ??
      raw.currentLat ??
      raw.currentLatitude,
  );
  const lng = numberFrom(
    location?.lng ??
      location?.longitude ??
      raw.lng ??
      raw.longitude ??
      raw.currentLng ??
      raw.currentLongitude,
  );

  if (!vehicleId || lat == null || lng == null) return null;

  const addressRaw = raw.address;
  const address =
    stringFrom(addressRaw) ??
    stringFrom(asRecord(addressRaw)?.fullAddress) ??
    stringFrom(asRecord(addressRaw)?.address);

  return {
    vehicleId,
    location: { lat, lng },
    address,
    timestamp:
      stringFrom(raw.timestamp) ??
      stringFrom(raw.createdAt) ??
      stringFrom(raw.recordedAt) ??
      stringFrom(raw.updatedAt),
  };
}

const LoadQuotesSocketContext = createContext<LoadQuotesSocketContextValue>({
  isConnected: false,
  subscribeToLoad: () => {},
  unsubscribeFromLoad: () => {},
  subscribeToVehicle: () => {},
  unsubscribeFromVehicle: () => {},
  vehicleLocations: {},
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
  const queryClient = useQueryClient();

  const socketRef = useRef<Socket | null>(null);
  const subscribedLoadsRef = useRef<Set<string>>(new Set());
  const subscribedVehiclesRef = useRef<Set<string>>(new Set());
  const lastServerEventAtRef = useRef<Record<string, number>>({});
  const lastQuoteFeedbackAtRef = useRef(0);
  const [connected, setConnected] = useState(false);
  const [vehicleLocations, setVehicleLocations] = useState<
    Record<string, VehicleLocation>
  >({});

  const notifyNewQuote = useCallback(
    (loadId?: string) => {
      const now = Date.now();
      if (now - lastQuoteFeedbackAtRef.current > 1500) {
        lastQuoteFeedbackAtRef.current = now;
        Vibration.vibrate(Platform.OS === 'android' ? [0, 180] : undefined);
      }

      if (userId != null) {
        queryClient.setQueryData<number>(
          queryKeys.dropyou.quotesSummary(userId),
          (current) => (typeof current === 'number' ? current + 1 : 1),
        );
        void queryClient.invalidateQueries({
          queryKey: queryKeys.dropyou.quotesSummary(userId),
        });
        void queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === 'dropyou' && query.queryKey[1] === 'quotes',
        });
      }

      if (__DEV__) {
        console.log('[LoadQuotesSocket] new quote feedback', {
          loadId,
          userId,
          feedback: 'vibration + notification badge refresh',
        });
      }
    },
    [queryClient, userId],
  );

  const attachQuoteListeners = useCallback((socket: Socket) => {
    const logServerTiming = (event: string, key?: string) => {
      if (!__DEV__) return;
      const now = Date.now();
      const timingKey = key ? `${event}:${key}` : event;
      const previous = lastServerEventAtRef.current[timingKey];
      lastServerEventAtRef.current[timingKey] = now;
      console.log('[LoadQuotesSocket] server data timing', {
        event,
        key,
        receivedAt: new Date(now).toISOString(),
        deltaMs: previous == null ? null : now - previous,
        deltaSeconds: previous == null ? null : Number(((now - previous) / 1000).toFixed(2)),
      });
    };

    const logPayload = (event: string, data: unknown) => {
      if (!__DEV__) return;
      try {
        console.log(`[LoadQuotesSocket] ← ${event}`, JSON.stringify(data, null, 2));
      } catch {
        console.log(`[LoadQuotesSocket] ← ${event}`, data);
      }
    };

    const onDropyou = (data: unknown) => {
      const row = asRecord(data);
      const loadId = stringFrom(
        asRecord(row?.quote)?.loadId ??
          asRecord(row?.quote)?.load_id ??
          row?.loadId ??
          row?.load_id,
      );
      logServerTiming('dropyou_quote_received', loadId);
      logPayload('dropyou_quote_received', data);
      const added = useLoadQuotesStore
        .getState()
        .ingestQuote(data, 'dropyou_quote_received');
      if (added) notifyNewQuote(loadId);
    };
    const onTeg = (data: unknown) => {
      const row = asRecord(data);
      const loadId = stringFrom(
        asRecord(row?.quote)?.loadId ??
          asRecord(row?.quote)?.load_id ??
          row?.loadId ??
          row?.load_id,
      );
      logServerTiming('teg_quotes', loadId);
      logPayload('teg_quotes', data);
      const added = useLoadQuotesStore.getState().ingestQuote(data, 'teg_quotes');
      if (added) notifyNewQuote(loadId);
    };
    const onVehicleLocation = (data: unknown) => {
      const normalized = normalizeVehicleLocation(data);
      logServerTiming('vehicle_location_updates', normalized?.vehicleId);
      logPayload('vehicle_location_updates', data);
      if (!normalized) return;
      setVehicleLocations((prev) => ({ ...prev, [normalized.vehicleId]: normalized }));
    };
    socket.on('dropyou_quote_received', onDropyou);
    socket.on('teg_quotes', onTeg);
    socket.on('vehicle_location_updates', onVehicleLocation);
    return () => {
      socket.off('dropyou_quote_received', onDropyou);
      socket.off('teg_quotes', onTeg);
      socket.off('vehicle_location_updates', onVehicleLocation);
    };
  }, [notifyNewQuote]);

  const emitJoinRooms = useCallback((socket: Socket, uid: number) => {
    socket.emit('join_user', { userId: uid });
    socket.emit('joinNotifications', { userId: uid });
  }, []);

  const resubscribeAllLoads = useCallback((socket: Socket) => {
    for (const loadId of subscribedLoadsRef.current) {
      if (__DEV__) {
        console.log(
          '[LoadQuotesSocket] emit subscribe_to_load (after connect / reconnect)',
          { loadId },
        );
      }
      socket.emit('subscribe_to_load', { loadId });
    }
    for (const vehicleId of subscribedVehiclesRef.current) {
      if (__DEV__) {
        console.log(
          '[LoadQuotesSocket] emit subscribe_to_vehicle (after connect / reconnect)',
          { vehicleId },
        );
      }
      socket.emit('subscribe_to_vehicle', { vehicleId });
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
        if (!token && __DEV__)
          debugLog('LoadQuotesSocket', 'No access token; socket not started');
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

      socket.on(
        'connect_error',
        (err: Error & { description?: string; type?: string; data?: unknown }) => {
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
        },
      );
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
      console.log(
        '[LoadQuotesSocket] subscribe_to_load queued (socket not connected yet)',
        {
          loadId: id,
          hint: 'Will emit on connect with join_user + pending subscriptions',
        },
      );
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

  const subscribeToVehicle = useCallback((vehicleId: string) => {
    const id = String(vehicleId).trim();
    if (!id) return;
    subscribedVehiclesRef.current.add(id);
    const s = socketRef.current;
    if (s?.connected) {
      if (__DEV__) {
        console.log('[LoadQuotesSocket] emit subscribe_to_vehicle', { vehicleId: id });
      }
      s.emit('subscribe_to_vehicle', { vehicleId: id });
    } else if (__DEV__) {
      console.log(
        '[LoadQuotesSocket] subscribe_to_vehicle queued (socket not connected yet)',
        {
          vehicleId: id,
        },
      );
    }
  }, []);

  const unsubscribeFromVehicle = useCallback((vehicleId: string) => {
    const id = String(vehicleId).trim();
    if (!id) return;
    subscribedVehiclesRef.current.delete(id);
    const s = socketRef.current;
    if (s?.connected) {
      if (__DEV__) {
        console.log('[LoadQuotesSocket] emit unsubscribe_from_vehicle', {
          vehicleId: id,
        });
      }
      s.emit('unsubscribe_from_vehicle', { vehicleId: id });
    }
  }, []);

  const value = useMemo<LoadQuotesSocketContextValue>(
    () => ({
      isConnected: connected,
      subscribeToLoad,
      unsubscribeFromLoad,
      subscribeToVehicle,
      unsubscribeFromVehicle,
      vehicleLocations,
    }),
    [
      connected,
      subscribeToLoad,
      subscribeToVehicle,
      unsubscribeFromLoad,
      unsubscribeFromVehicle,
      vehicleLocations,
    ],
  );

  return (
    <LoadQuotesSocketContext.Provider value={value}>
      {children}
    </LoadQuotesSocketContext.Provider>
  );
}
