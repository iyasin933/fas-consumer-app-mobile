import type { DeliveryStop, DeliveryTab } from '@/features/map/types';

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Short label for the delivery header card (pickup timing / same-day).
 */
export function buildDeliveryScheduleSummary(tab: DeliveryTab, rows: DeliveryStop[]): string {
  if (tab === 'sameDay') return 'ASAP';
  const pickup = rows.find((r) => r.kind === 'pickup');
  if (!pickup?.window?.fromISO || !pickup.dateISO) return 'Scheduled';
  return `${fmtDate(pickup.dateISO)} · ${fmtTime(pickup.window.fromISO)}`;
}
