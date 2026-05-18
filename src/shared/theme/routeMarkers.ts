export const ROUTE_MARKER_COLORS = {
  pickup: '#2ECC71',
  stop: '#F59E0B',
  dropoff: '#EF4444',
} as const;

export const ROUTE_MARKER_SOFT_COLORS = {
  pickup: 'rgba(46, 204, 113, 0.12)',
  stop: 'rgba(245, 158, 11, 0.14)',
  dropoff: '#FEE2E2',
} as const;

export type RouteMarkerKind = keyof typeof ROUTE_MARKER_COLORS;
