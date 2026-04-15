import type { ReportReason } from '../types/domain';
import { blockUser } from './blocklist';
import { getSupabase } from './supabase';

export async function submitReport(reporterId: string, reportedId: string, reason: ReportReason, detail: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from('reports').upsert(
    {
      reporter_id: reporterId,
      reported_id: reportedId,
      reason,
      detail,
      status: 'pending',
    },
    { onConflict: 'reporter_id,reported_id' },
  );

  if (error) throw error;
  await blockUser(reporterId, reportedId);
}
