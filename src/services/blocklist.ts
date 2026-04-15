import { fetchProfilesByIds } from './profile';
import { getSupabase } from './supabase';

export async function blockUser(userId: string, targetId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('blocklist')
    .upsert({ blocker_id: userId, blocked_id: targetId }, { onConflict: 'blocker_id,blocked_id' });

  if (error) throw error;

  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select('id')
    .or(`and(user_a.eq.${userId},user_b.eq.${targetId}),and(user_a.eq.${targetId},user_b.eq.${userId})`)
    .eq('status', 'matched');

  if (matchError) throw matchError;

  const matchIds = (matches ?? []).map((item: { id: string }) => item.id);
  if (matchIds.length > 0) {
    const { error: updateError } = await supabase.from('matches').update({ status: 'unmatched' }).in('id', matchIds);
    if (updateError) throw updateError;
  }
}

export async function unblockUser(userId: string, targetId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('blocklist').delete().eq('blocker_id', userId).eq('blocked_id', targetId);
  if (error) throw error;
}

export async function getBlocklist(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('blocklist').select('*').eq('blocker_id', userId).order('created_at', { ascending: false });
  if (error) throw error;

  const targetIds = (data ?? []).map((item: { blocked_id: string }) => item.blocked_id);
  const profiles = await fetchProfilesByIds(targetIds, { sanitize: true });
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return (data ?? [])
    .map((entry: { id: string; blocked_id: string; created_at: string }) => ({
      id: entry.id,
      createdAt: entry.created_at,
      profile: profileMap.get(entry.blocked_id),
    }))
    .filter((entry) => entry.profile);
}

export async function isBlocked(userId: string, targetId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('blocklist')
    .select('id')
    .or(`and(blocker_id.eq.${userId},blocked_id.eq.${targetId}),and(blocker_id.eq.${targetId},blocked_id.eq.${userId})`)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}
