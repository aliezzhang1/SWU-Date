import type {
  DailyMatchResultRecord,
  DailyMatchSnapshot,
  MatchPreferenceRecord,
  MatchPreferences,
  MatchRecord,
  MatchWithProfile,
} from '../types/domain';
import { fetchCurrentUserProfile, fetchProfilesByIds, isOnboardingCompleteFromAnswers } from './profile';
import { getSupabase } from './supabase';
import { supportsBinaryMatching } from '../utils/matching';

const MATCH_REVEAL_HOUR = 21;
const MATCH_REVEAL_MINUTE = 0;
const MATCH_REVEAL_WEEKDAY = 5;
const DEFAULT_MATCH_PREFERENCES: MatchPreferences = {
  maxGradeDiff: 1,
  reminderEnabled: true,
  reminderHour: 20,
  reminderMinute: 55,
};

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromLocalDateKey(dateKey: string, hour = MATCH_REVEAL_HOUR, minute = MATCH_REVEAL_MINUTE): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, hour, minute, 0, 0);
}

function getThisWeekRevealAt(now = new Date()): Date {
  const revealAt = new Date(now);
  const dayDiff = MATCH_REVEAL_WEEKDAY - revealAt.getDay();
  revealAt.setDate(revealAt.getDate() + dayDiff);
  revealAt.setHours(MATCH_REVEAL_HOUR, MATCH_REVEAL_MINUTE, 0, 0);
  return revealAt;
}

function getLastRevealAt(now = new Date()): Date {
  const thisWeekRevealAt = getThisWeekRevealAt(now);
  if (now >= thisWeekRevealAt) {
    return thisWeekRevealAt;
  }

  const previousRevealAt = new Date(thisWeekRevealAt);
  previousRevealAt.setDate(previousRevealAt.getDate() - 7);
  return previousRevealAt;
}

function getNextMatchAt(now = new Date()): Date {
  const thisWeekRevealAt = getThisWeekRevealAt(now);
  if (now < thisWeekRevealAt) {
    return thisWeekRevealAt;
  }

  const nextRevealAt = new Date(thisWeekRevealAt);
  nextRevealAt.setDate(nextRevealAt.getDate() + 7);
  return nextRevealAt;
}

function mapMatchPreferences(record?: MatchPreferenceRecord | null): MatchPreferences {
  if (!record) {
    return { ...DEFAULT_MATCH_PREFERENCES };
  }

  return {
    maxGradeDiff: record.max_grade_diff,
    reminderEnabled: record.reminder_enabled,
    reminderHour: record.reminder_hour,
    reminderMinute: record.reminder_minute,
  };
}

function toMatchPreferencePayload(userId: string, preferences: MatchPreferences) {
  return {
    user_id: userId,
    max_grade_diff: preferences.maxGradeDiff,
    reminder_enabled: preferences.reminderEnabled,
    reminder_hour: preferences.reminderHour,
    reminder_minute: preferences.reminderMinute,
    updated_at: new Date().toISOString(),
  };
}

function buildWaitingSnapshot(roundDate: string, nextMatchAt: Date, preferences: MatchPreferences): DailyMatchSnapshot {
  return {
    phase: 'waiting',
    roundDate,
    nextMatchAt: nextMatchAt.toISOString(),
    preferences,
    match: null,
    title: '距离下一次揭晓',
    description: '系统会在每周五 21:00 统一发放 1 位当前最契合的人。',
  };
}

function buildIncompleteSnapshot(roundDate: string, nextMatchAt: Date, preferences: MatchPreferences): DailyMatchSnapshot {
  return {
    phase: 'complete_profile',
    roundDate,
    nextMatchAt: nextMatchAt.toISOString(),
    preferences,
    match: null,
    title: '补完问卷，本周五才会有结果',
    description: '完整回答后，系统才会把你放进每周五 21:00 的配对池。',
  };
}

function buildRestrictedSnapshot(roundDate: string, nextMatchAt: Date, preferences: MatchPreferences): DailyMatchSnapshot {
  return {
    phase: 'gender_restricted',
    roundDate,
    nextMatchAt: nextMatchAt.toISOString(),
    preferences,
    match: null,
    title: '当前版本先按男女互配',
    description: '这一版会先把每周配对限制在男女互配，后续再扩展更多匹配方案。',
  };
}

function buildProcessingSnapshot(roundDate: string, nextMatchAt: Date, preferences: MatchPreferences): DailyMatchSnapshot {
  return {
    phase: 'processing',
    roundDate,
    nextMatchAt: nextMatchAt.toISOString(),
    preferences,
    match: null,
    title: '本周结果正在送达',
    description: '周五 21:00 的统一配对已经开始，结果通常会在几十秒内同步到首页。',
  };
}

async function buildSnapshotFromResult(userId: string, result: DailyMatchResultRecord, preferences: MatchPreferences): Promise<DailyMatchSnapshot> {
  const nextMatchAt = getNextMatchAt();
  if (result.status === 'matched' && result.match_id) {
    const match = await getMatchDetail(result.match_id, userId);
    return {
      phase: 'matched',
      roundDate: result.match_date,
      nextMatchAt: nextMatchAt.toISOString(),
      preferences,
      match,
      title: match ? '这位，值得你认真看一眼' : '本周的配对已经生成',
      description: match ? '本周只发这一位，先看公开资料，再决定要不要继续。' : '这轮配对已经生成，但资料暂时还没同步完整。',
    };
  }

  return {
    phase: 'unmatched',
    roundDate: result.match_date,
    nextMatchAt: nextMatchAt.toISOString(),
    preferences,
    match: null,
    title: '这周先把机会留给更合适的人',
    description: '如果这周没有同时满足条件和契合度的人，我们宁可空一轮，也不随便发放。',
  };
}


async function ensureMatchPreferences(userId: string): Promise<MatchPreferences> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('match_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (data) {
    return mapMatchPreferences(data as MatchPreferenceRecord);
  }

  const payload = toMatchPreferencePayload(userId, DEFAULT_MATCH_PREFERENCES);
  const { error: upsertError } = await supabase.from('match_preferences').upsert(payload, { onConflict: 'user_id' });
  if (upsertError) throw upsertError;
  return { ...DEFAULT_MATCH_PREFERENCES };
}

export async function getMatchPreferences(userId: string): Promise<MatchPreferences> {
  return ensureMatchPreferences(userId);
}

export async function updateMatchPreferences(userId: string, preferences: MatchPreferences): Promise<MatchPreferences> {
  const supabase = getSupabase();
  const payload = toMatchPreferencePayload(userId, preferences);
  const { error } = await supabase.from('match_preferences').upsert(payload, { onConflict: 'user_id' });
  if (error) throw error;
  return preferences;
}

async function getDailyResultForUser(userId: string, roundDate: string): Promise<DailyMatchResultRecord | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('daily_match_results')
    .select('*')
    .eq('user_id', userId)
    .eq('match_date', roundDate)
    .maybeSingle();

  if (error) throw error;
  return (data as DailyMatchResultRecord | null) ?? null;
}

export async function getMatchDetail(matchId: string, userId: string): Promise<MatchWithProfile | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('matches').select('*').eq('id', matchId).single();
  if (error) throw error;
  if (!data) return null;

  const record = data as MatchRecord;
  const partnerId = record.user_a === userId ? record.user_b : record.user_a;
  const [partner] = await fetchProfilesByIds([partnerId], { sanitize: true });
  if (!partner) return null;

  return {
    id: record.id,
    score: record.score,
    status: record.status,
    createdAt: record.created_at,
    matchedAt: record.matched_at,
    partner,
  };
}

export async function getMatches(userId: string): Promise<MatchWithProfile[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'matched')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order('matched_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as MatchRecord[];
  const partnerIds = rows.map((row) => (row.user_a === userId ? row.user_b : row.user_a));
  const partnerProfiles = await fetchProfilesByIds(partnerIds, { sanitize: true });
  const profileMap = new Map(partnerProfiles.map((profile) => [profile.id, profile]));

  return rows
    .map((row) => {
      const partnerId = row.user_a === userId ? row.user_b : row.user_a;
      const partner = profileMap.get(partnerId);
      if (!partner) return null;
      return {
        id: row.id,
        score: row.score,
        status: row.status,
        createdAt: row.created_at,
        matchedAt: row.matched_at,
        partner,
      } satisfies MatchWithProfile;
    })
    .filter(Boolean) as MatchWithProfile[];
}

export async function unmatch(matchId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('matches').update({ status: 'unmatched' }).eq('id', matchId);
  if (error) throw error;
}

function isLocalMatchLetterPreviewEnabled(): boolean {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname;
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';
  return isLocalHost && new URLSearchParams(window.location.search).get('previewMatchLetter') === '1';
}

export async function getDailyMatchSnapshot(userId: string): Promise<DailyMatchSnapshot> {
  const [preferences, currentUser] = await Promise.all([
    ensureMatchPreferences(userId),
    fetchCurrentUserProfile(userId),
  ]);

  const now = new Date();
  const nextMatchAt = getNextMatchAt(now);
  const thisWeekRevealAt = getThisWeekRevealAt(now);
  const lastRevealAt = getLastRevealAt(now);
  const activeRoundDate = toLocalDateKey(lastRevealAt);
  const nextRoundDate = toLocalDateKey(nextMatchAt);

  if (!currentUser) {
    throw new Error('找不到当前用户信息。');
  }

  if (isLocalMatchLetterPreviewEnabled()) {
    const [latestMatch] = await getMatches(userId);
    if (latestMatch) {
      return {
        phase: 'matched',
        roundDate: activeRoundDate,
        nextMatchAt: nextMatchAt.toISOString(),
        preferences,
        match: latestMatch,
        title: '这位，值得你认真看一眼',
        description: '本地预览模式会用你最新的一条匹配展示信封和契合报告，正式发放仍按每周五 21:00。',
      };
    }
  }

  if (!isOnboardingCompleteFromAnswers(currentUser.answers)) {
    return buildIncompleteSnapshot(nextRoundDate, nextMatchAt, preferences);
  }

  if (!supportsBinaryMatching(currentUser.gender)) {
    return buildRestrictedSnapshot(nextRoundDate, nextMatchAt, preferences);
  }

  if (new Date(currentUser.createdAt) > lastRevealAt) {
    return buildWaitingSnapshot(nextRoundDate, nextMatchAt, preferences);
  }

  const result = await getDailyResultForUser(userId, activeRoundDate);
  if (result) {
    return buildSnapshotFromResult(userId, result, preferences);
  }

  if (now >= thisWeekRevealAt) {
    return buildProcessingSnapshot(activeRoundDate, nextMatchAt, preferences);
  }

  return buildWaitingSnapshot(nextRoundDate, nextMatchAt, preferences);
}

export { DEFAULT_MATCH_PREFERENCES, MATCH_REVEAL_HOUR, MATCH_REVEAL_MINUTE, fromLocalDateKey };