import { useEffect, useRef, useState } from 'react';

import { env } from '@/shared/config/env';
import { debugLog } from '@/utils/debugLog';

export type PlaceSuggestion = {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  fullText: string;
};

export type PlaceDetails = {
  address: string;
  lat: number;
  lng: number;
  placeId: string;
  streetAddress?: string;
  city?: string;
  postalCode?: string;
};

const DEBOUNCE_MS = 300;
const SESSION_TOKEN_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

function makeSessionToken(): string {
  let out = '';
  for (let i = 0; i < 24; i++) {
    out += SESSION_TOKEN_CHARS[Math.floor(Math.random() * SESSION_TOKEN_CHARS.length)];
  }
  return out;
}

/**
 * Debounced Google Places Autocomplete. Reuses a `sessiontoken` across the
 * typing session so billing stays cheap (one per selected detail call).
 *
 * A single in-flight request is cancelled with AbortController whenever the
 * input changes; results arrive in query order.
 */
export function usePlacesAutocomplete(query: string, bias?: { lat: number; lng: number }) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const sessionTokenRef = useRef<string>(makeSessionToken());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const key = env.googleMapsApiKey;
    if (!key) {
      debugLog('Places', 'Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY');
      setSuggestions([]);
      return;
    }

    const handle = setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);

      const params = new URLSearchParams({
        input: trimmed,
        key,
        sessiontoken: sessionTokenRef.current,
        types: 'geocode',
        components: 'country:gb',
      });
      if (bias) {
        params.set('location', `${bias.lat},${bias.lng}`);
        params.set('radius', '50000');
      }

      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;
      fetch(url, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((json: { status: string; predictions?: PlacePredictionApi[] }) => {
          if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
            debugLog('Places', `status=${json.status}`);
          }
          const list: PlaceSuggestion[] = (json.predictions ?? []).map((p) => ({
            placeId: p.place_id,
            primaryText: p.structured_formatting?.main_text ?? p.description,
            secondaryText: p.structured_formatting?.secondary_text ?? '',
            fullText: p.description,
          }));
          setSuggestions(list);
          setLoading(false);
        })
        .catch((e) => {
          if (e instanceof Error && e.name === 'AbortError') return;
          debugLog('Places', e instanceof Error ? e.message : 'autocomplete error');
          setSuggestions([]);
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(handle);
    };
  }, [query, bias]);

  return { suggestions, loading };
}

type PlacePredictionApi = {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
};

/**
 * Fetch `/place/details` for a tapped prediction. Consumes the session token so
 * we rotate it after each selection (Google billing convention).
 *
 * Robustness guarantees:
 *  - 8-second hard timeout so the UI never "hangs" waiting for the network.
 *  - Valid dot-notation `fields` mask (the slash form `geometry/location`
 *    returns INVALID_REQUEST silently).
 *  - Structured error: throws `PlacesDetailsError` with Google's own
 *    `error_message` so the caller can show a useful toast instead of
 *    failing open.
 */
export class PlacesDetailsError extends Error {
  constructor(message: string, public readonly status?: string) {
    super(message);
    this.name = 'PlacesDetailsError';
  }
}

type PlaceAddressComponentApi = {
  short_name?: string;
  long_name?: string;
  types?: string[];
};

function isUkPlace(components?: PlaceAddressComponentApi[]): boolean {
  return Boolean(
    components?.some(
      (component) =>
        component.types?.includes('country') &&
        component.short_name?.toUpperCase() === 'GB',
    ),
  );
}

function componentValue(
  components: PlaceAddressComponentApi[] | undefined,
  types: string[],
): string {
  const component = components?.find((item) =>
    types.some((type) => item.types?.includes(type)),
  );
  return component?.long_name ?? component?.short_name ?? '';
}

function streetAddressFromComponents(components: PlaceAddressComponentApi[] | undefined): string {
  const streetNumber = componentValue(components, ['street_number']);
  const route = componentValue(components, ['route']);
  const premise = componentValue(components, ['premise', 'subpremise']);
  return [premise, streetNumber, route].filter(Boolean).join(' ');
}

export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const key = env.googleMapsApiKey;
  if (!key) {
    throw new PlacesDetailsError('Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY');
  }

  const params = new URLSearchParams({
    place_id: placeId,
    key,
    fields: 'formatted_address,geometry,address_components',
  });
  const url = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    const json = (await res.json()) as {
      status: string;
      error_message?: string;
      result?: {
        formatted_address?: string;
        address_components?: PlaceAddressComponentApi[];
        geometry?: { location?: { lat: number; lng: number } };
      };
    };

    if (json.status !== 'OK' || !json.result?.geometry?.location) {
      const detail = json.error_message ? ` — ${json.error_message}` : '';
      debugLog('Places', `details status=${json.status}${detail}`);
      throw new PlacesDetailsError(
        `Places Details request failed (${json.status})${detail}`,
        json.status,
      );
    }
    if (!isUkPlace(json.result.address_components)) {
      throw new PlacesDetailsError('Please choose an address in the UK.', 'OUT_OF_REGION');
    }

    return {
      address: json.result.formatted_address ?? '',
      lat: json.result.geometry.location.lat,
      lng: json.result.geometry.location.lng,
      placeId,
      streetAddress: streetAddressFromComponents(json.result.address_components),
      city: componentValue(json.result.address_components, [
        'postal_town',
        'locality',
        'administrative_area_level_2',
      ]),
      postalCode: componentValue(json.result.address_components, ['postal_code']),
    };
  } catch (e) {
    if (e instanceof PlacesDetailsError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new PlacesDetailsError('Timed out reaching Google Places.');
    }
    const msg = e instanceof Error ? e.message : 'Places details network error';
    debugLog('Places', msg);
    throw new PlacesDetailsError(msg);
  } finally {
    clearTimeout(timeout);
  }
}
