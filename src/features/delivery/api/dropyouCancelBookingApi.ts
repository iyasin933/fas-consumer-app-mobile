import { api } from '@/api/client';

/** Matches web: DELETE /dropyou/cancel/:loadId */
export async function cancelDropyouBooking(loadId: string | number): Promise<unknown> {
  const id = String(loadId).trim();
  if (!id) throw new Error('Missing load id');
  const { data } = await api.delete<unknown>(`/dropyou/cancel/${id}`);
  return data;
}
