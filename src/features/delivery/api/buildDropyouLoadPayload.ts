import type { DeliveryVehicleDto } from '@/features/delivery/api/consumerBookingPriceApi';
import type { ContentDimensionsDraft, PalletLineDraft } from '@/features/delivery/types';
import { resolveTegVehicleApiKeyForPayload } from '@/features/delivery/utils/tegVehicleApiKey';
import type { DeliveryStop, DeliveryTab, PlaceValue } from '@/features/map/types';
import { mergeStopDateTime } from '@/features/map/utils/deliverySchedule';

const UK_TIME_ZONE = 'Europe/London';

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

function getUkDateTimeParts(d: Date): {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
} | null {
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: UK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const byType = new Map(parts.map((part) => [part.type, part.value]));
  const year = byType.get('year');
  const month = byType.get('month');
  const day = byType.get('day');
  const hour = byType.get('hour');
  const minute = byType.get('minute');
  if (!year || !month || !day || !hour || !minute) return null;
  return { year, month, day, hour: hour === '24' ? '00' : hour, minute };
}

function fmtYyyyMmDdUk(d: Date): string {
  const parts = getUkDateTimeParts(d);
  if (!parts) return '';
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function fmtTimeGb(d: Date): string {
  const parts = getUkDateTimeParts(d);
  if (!parts) return '';
  return `${parts.hour}:${parts.minute}`;
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

function minutesOfDay(d: Date): number {
  const time = fmtTimeGb(d);
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
}

function setMinutesOfDay(source: Date, minutes: number): Date {
  const currentMinutes = minutesOfDay(source);
  return new Date(source.getTime() + (minutes - currentMinutes) * 60 * 1000);
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
  const chronological = candidate.getTime() >= arrivalAt.getTime() ? candidate : arrivalAt;
  return scheduled ? ensureDropoffClockAfterPickup(chronological, pickupAt) : chronological;
}

function devLogSchedule(source: 'scheduled' | 'same_day', pickupAt: Date, dropoffAt: Date): void {
  if (!__DEV__) return;
  console.log('[buildDropyouLoadPayload] resolved schedule', {
    source,
    pickUpDate: fmtYyyyMmDdUk(pickupAt),
    pickupTime: fmtTimeGb(pickupAt),
    dropOffDate: fmtYyyyMmDdUk(dropoffAt),
    dropoffTime: fmtTimeGb(dropoffAt),
    timeZone: UK_TIME_ZONE,
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
 * Same-day tab clears schedule pills on the map; match the web app contract by
 * sending today's UK date with an ASAP drop-off.
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
  const pickUpDate = fmtYyyyMmDdUk(pickupAt);
  return {
    pickUpDate,
    pickupTime: fmtTimeGb(pickupAt),
    dropOffDate: pickUpDate,
    dropoffTime: 'ASAP',
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
  /** Map store route duration — used to log same-day ETA and validate scheduled drop-off floors. */
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
          pickUpDate: fmtYyyyMmDdUk(pickupAt),
          pickupTime: fmtTimeGb(pickupAt),
          dropOffDate: fmtYyyyMmDdUk(dropoffAt),
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
