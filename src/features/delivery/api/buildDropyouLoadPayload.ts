import type { DeliveryVehicleDto } from '@/features/delivery/api/consumerBookingPriceApi';
import type { ContentDimensionsDraft, PalletLineDraft } from '@/features/delivery/types';
import { resolveTegVehicleApiKeyForPayload } from '@/features/delivery/utils/tegVehicleApiKey';
import type { DeliveryStop, DeliveryTab, PlaceValue } from '@/features/map/types';
import { DROPOFF_BUFFER_MS } from '@/features/map/utils/deliverySchedule';

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

function fmtTimeRange(window?: { fromISO: string; toISO: string }): string {
  if (!window?.fromISO) return '';
  const from = new Date(window.fromISO);
  const to = window.toISO ? new Date(window.toISO) : from;
  if (Number.isNaN(from.getTime())) return '';
  const a = fmtTimeGb(from);
  const b = fmtTimeGb(to);
  return a === b ? a : `${a} – ${b}`;
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
  const pickupAt = new Date();
  const driveSec = Math.max(60, routeDurationSec ?? 90 * 60);
  const dropoffAt = new Date(pickupAt.getTime() + driveSec * 1000 + DROPOFF_BUFFER_MS);
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
    ? {
        pickUpDate: pickupRow?.dateISO ? fmtYyyyMmDd(pickupRow.dateISO) : '',
        pickupTime: fmtTimeRange(pickupRow?.window),
        dropOffDate: dropoffRow?.dateISO ? fmtYyyyMmDd(dropoffRow.dateISO) : '',
        dropoffTime: fmtTimeRange(dropoffRow?.window),
      }
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
