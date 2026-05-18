import type { DeliveryVehicleDto } from '@/features/delivery/api/consumerBookingPriceApi';
import type { ContentDimensionsDraft, PalletLineDraft } from '@/features/delivery/types';
import { resolveTegVehicleApiKeyForPayload } from '@/features/delivery/utils/tegVehicleApiKey';
import type { DeliveryStop, DeliveryTab, PlaceValue } from '@/features/map/types';
import { mergeStopDateTime } from '@/features/map/utils/deliverySchedule';

/** Request body for `POST /dropyou/load` — aligned with working Postman / legacy consumer shape. */
export type DropyouLoadPayload = {
  pickUpDate: string;
  pickupTime: string;
  dropOffDate: string;
  dropoffTime: string;
  pickUpAddress: {
    address: string;
    location: { latitude: number; longitude: number };
  };
  dropOffAddress: {
    address: string;
    location: { latitude: number; longitude: number };
  };
  stops: { address: string; location: { latitude: number; longitude: number } }[];
  deliveryContent: {
    palletName: string;
    /** Backend accepts the literal string `"null"` when no value is declared (legacy). */
    palletValue: string;
    palletContent: string;
    palletImage: string;
    length: number;
    width: number;
    height: number;
    weight: number;
  };
  units: 'cm';
  vehicle: { name: string; apiKey: string; price: number };
  deliveryType: 'Same Day Delivery' | 'Scheduled Delivery';
  recipient: { notes: string; phone: string };
};

function parseNum(s: string): number {
  const n = parseFloat(String(s).replace(/,/g, '.'));
  return Number.isFinite(n) ? n : 0;
}

function fmtYyyyMmDd(isoDate?: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtTimeGb(d: Date): string {
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function validDate(d: Date): boolean {
  return !Number.isNaN(d.getTime());
}

function minPickupAt(): Date {
  return new Date(Date.now() + 3 * 60 * 1000);
}

function ensureFuturePickup(pickupAt: Date): Date {
  const min = minPickupAt();
  return !validDate(pickupAt) || pickupAt.getTime() < min.getTime() ? min : pickupAt;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function sameClockOnDate(source: Date, targetDate: Date): Date {
  const next = new Date(source);
  next.setFullYear(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  return next;
}

function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function setMinutesOfDay(source: Date, minutes: number): Date {
  const next = new Date(source);
  next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return next;
}

function ensureDropoffClockAfterPickup(dropoffAt: Date, pickupAt: Date): Date {
  const pickupMinutes = minutesOfDay(pickupAt);
  const dropoffMinutes = minutesOfDay(dropoffAt);
  if (dropoffMinutes > pickupMinutes) return dropoffAt;

  // TEG rejects overnight scheduled loads when the HH:mm value is earlier than readyAt,
  // even if the drop-off date is the next day. Keep the date, but send a later clock.
  const safeMinutes = Math.min(pickupMinutes + 30, 23 * 60 + 59);
  return setMinutesOfDay(dropoffAt, safeMinutes);
}

function ensureDropoffAfterPickup(
  dropoffAt: Date,
  pickupAt: Date,
  routeDurationSec: number | null,
  scheduled: boolean,
): Date {
  const driveMs = Math.max(60, routeDurationSec ?? 30 * 60) * 1000;
  const arrivalAt = new Date(pickupAt.getTime() + driveMs);
  let candidate = validDate(dropoffAt) ? dropoffAt : arrivalAt;

  if (scheduled) {
    const minScheduledDate = addDays(pickupAt, 1);
    if (candidate < minScheduledDate) {
      candidate = sameClockOnDate(candidate, minScheduledDate);
    }
  }

  const chronological = candidate.getTime() >= arrivalAt.getTime() ? candidate : arrivalAt;
  return scheduled ? ensureDropoffClockAfterPickup(chronological, pickupAt) : chronological;
}

function devLogSchedule(source: 'scheduled' | 'same_day', pickupAt: Date, dropoffAt: Date): void {
  if (!__DEV__) return;
  console.log('[buildDropyouLoadPayload] resolved schedule', {
    source,
    pickUpDate: fmtYyyyMmDd(pickupAt.toISOString()),
    pickupTime: fmtTimeGb(pickupAt),
    dropOffDate: fmtYyyyMmDd(dropoffAt.toISOString()),
    dropoffTime: fmtTimeGb(dropoffAt),
    pickupISO: pickupAt.toISOString(),
    dropoffISO: dropoffAt.toISOString(),
  });
}

function addressBlock(place: PlaceValue | null) {
  return {
    address: place?.address ?? '',
    location: {
      latitude: place?.lat ?? 0,
      longitude: place?.lng ?? 0,
    },
  };
}

function stopsFromRows(rows: DeliveryStop[]) {
  return rows
    .filter((r) => r.kind === 'stop' && r.place?.address)
    .map((r) => ({
      address: r.place!.address,
      location: { latitude: r.place!.lat, longitude: r.place!.lng },
    }));
}

function totalLoadKg(pallets: PalletLineDraft[]): number {
  let sum = 0;
  for (const p of pallets) {
    sum += parseNum(p.weightKg);
  }
  return Math.max(0, Math.round(sum * 1000) / 1000);
}

function palletValueForPayload(primary: PalletLineDraft): string {
  const raw = primary.valueOfGoods?.trim() ?? '';
  if (!raw) return 'null';
  const n = parseNum(raw);
  if (!Number.isFinite(n) || n === 0) return 'null';
  return String(n);
}

function vehiclePricePounds(v: DeliveryVehicleDto): number {
  const n = v.priceWithVat ?? v.maxPrice ?? v.minPrice ?? 0;
  return Number.isFinite(n) ? Number(n) : 0;
}

function buildRecipientNotes(input: {
  recipientName: string;
  recipientCompany: string;
  recipientNotes: string;
}): string {
  const lines: string[] = [];
  const name = input.recipientName.trim();
  const company = input.recipientCompany.trim();
  const notes = input.recipientNotes.trim();
  if (name) lines.push(`Name: ${name}`);
  if (company) lines.push(`Company: ${company}`);
  if (notes) lines.push(notes);
  return lines.join('\n');
}

/**
 * Same-day tab clears schedule pills on the map; synthesize ISO dates + times from
 * “now” + Directions duration so `POST /dropyou/load` matches legacy Postman payloads.
 */
function buildSameDaySchedule(routeDurationSec: number | null): {
  pickUpDate: string;
  pickupTime: string;
  dropOffDate: string;
  dropoffTime: string;
} {
  const pickupAt = minPickupAt();
  const driveSec = Math.max(60, routeDurationSec ?? 90 * 60);
  const dropoffAt = new Date(pickupAt.getTime() + driveSec * 1000);
  devLogSchedule('same_day', pickupAt, dropoffAt);
  return {
    pickUpDate: fmtYyyyMmDd(pickupAt.toISOString()),
    pickupTime: fmtTimeGb(pickupAt),
    dropOffDate: fmtYyyyMmDd(dropoffAt.toISOString()),
    dropoffTime: fmtTimeGb(dropoffAt),
  };
}

export type BuildDropyouLoadPayloadInput = {
  tab: DeliveryTab;
  rows: DeliveryStop[];
  pickup: PlaceValue | null;
  dropoff: PlaceValue | null;
  pallets: PalletLineDraft[];
  dimensions: ContentDimensionsDraft;
  contentImageKeys: string[];
  vehicle: DeliveryVehicleDto;
  recipientName: string;
  recipientCompany: string;
  recipientDialCode: string;
  recipientPhoneLocal: string;
  recipientNotes: string;
  /** Map store route duration — used for same-day dropoff time when pills are empty. */
  routeDurationSec: number | null;
};

/**
 * Maps app draft + map form state into the DropYou load payload expected by
 * `POST /dropyou/load` (matches working Postman / TEG consumer shape).
 */
export function buildDropyouLoadPayload(input: BuildDropyouLoadPayloadInput): DropyouLoadPayload {
  const pickupRow = input.rows.find((r) => r.kind === 'pickup');
  const dropoffRow = input.rows.find((r) => r.kind === 'dropoff');

  const scheduled = input.tab === 'scheduled';
  const scheduleBlock = scheduled
    ? (() => {
        const pickupAt = ensureFuturePickup(
          mergeStopDateTime(pickupRow?.dateISO, pickupRow?.window?.fromISO),
        );
        const dropoffAt = ensureDropoffAfterPickup(
          mergeStopDateTime(dropoffRow?.dateISO, dropoffRow?.window?.fromISO),
          pickupAt,
          input.routeDurationSec,
          scheduled,
        );
        devLogSchedule('scheduled', pickupAt, dropoffAt);
        return {
          pickUpDate: fmtYyyyMmDd(pickupAt.toISOString()),
          pickupTime: fmtTimeGb(pickupAt),
          dropOffDate: fmtYyyyMmDd(dropoffAt.toISOString()),
          dropoffTime: fmtTimeGb(dropoffAt),
        };
      })()
    : buildSameDaySchedule(input.routeDurationSec);

  const primary = input.pallets[0] ?? {
    id: '',
    palletTypeValue: '',
    content: '',
    valueOfGoods: '',
    weightKg: '',
  };

  const dial = input.recipientDialCode.trim() || '+44';
  const local = input.recipientPhoneLocal.replace(/\s/g, '');
  const phone = local ? `${dial}${local}` : dial;

  const notes = buildRecipientNotes({
    recipientName: input.recipientName,
    recipientCompany: input.recipientCompany,
    recipientNotes: input.recipientNotes,
  });

  const weightKg = totalLoadKg(input.pallets);

  return {
    ...scheduleBlock,
    pickUpAddress: addressBlock(input.pickup),
    dropOffAddress: addressBlock(input.dropoff),
    stops: stopsFromRows(input.rows),
    deliveryContent: {
      palletName: (primary.palletTypeValue || '').trim(),
      palletValue: palletValueForPayload(primary),
      palletContent: (primary.content || '').trim(),
      palletImage: input.contentImageKeys[0] ?? '',
      length: Math.round(parseNum(input.dimensions.length)),
      width: Math.round(parseNum(input.dimensions.width)),
      height: Math.round(parseNum(input.dimensions.height)),
      weight: Math.round(weightKg),
    },
    units: 'cm',
    vehicle: {
      name: input.vehicle.name || 'Unknown',
      // TEG expects `vehicleTypes[].apiKey` — never use our list `id` (slug/uuid) as apiKey.
      apiKey: resolveTegVehicleApiKeyForPayload(input.vehicle),
      price: vehiclePricePounds(input.vehicle),
    },
    deliveryType: input.tab === 'sameDay' ? 'Same Day Delivery' : 'Scheduled Delivery',
    recipient: {
      notes,
      phone,
    },
  };
}
