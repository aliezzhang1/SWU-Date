import { createClient } from 'npm:@supabase/supabase-js@2';
import { canUsersMatchByGender, rankCandidates, supportsBinaryMatching } from '../../../src/utils/matching.ts';

const REQUIRED_QUESTION_IDS = [
  'grade',
  'college',
  'mbti',
  'hometownRegion',
  'campusMode',
  'campusActivity',
  'circleStyle',
  'weekend',
  'schedule',
  'energy',
  'exercise',
  'relax',
  'pets',
  'socialFrequency',
  'smoking',
  'drinking',
  'spendingStyle',
  'values',
  'relationshipGoal',
  'pace',
  'distance',
  'planning',
  'partnerPreference',
  'conflictStyle',
  'reassuranceNeed',
  'ambition',
  'familyCloseness',
  'replyStyle',
  'chatFrequency',
  'directness',
  'personalSpace',
  'dateStyle',
  'diet',
] as const;

type Gender = 'male' | 'female' | 'other' | 'prefer_not_say';
type UserRole = 'user' | 'admin';
type QuestionValue = string | string[] | null;
type DailyMatchStatus = 'matched' | 'unmatched';

interface UserRow {
  id: string;
  student_id: string;
  nickname: string;
  avatar_url: string | null;
  gender: Gender;
  grade: string | null;
  college: string | null;
  bio: string | null;
  role: UserRole;
  is_banned: boolean;
  is_verified: boolean;
  created_at: string;
  last_active_at: string | null;
}

interface ProfileAnswerRow {
  user_id: string;
  question_id: string;
  answer: QuestionValue;
  updated_at: string;
}

interface MatchPreferenceRow {
  user_id: string;
  max_grade_diff: number | null;
}

interface MatchRow {
  id: string;
  user_a: string;
  user_b: string;
  status: 'matched' | 'unmatched';
}

interface DailyMatchResultRow {
  id: string;
  user_id: string;
  match_date: string;
  partner_id: string | null;
  match_id: string | null;
  score: number;
  status: DailyMatchStatus;
}

interface FunctionPayload {
  roundDate?: string;
  source?: string;
}

interface FunctionResponse {
  ok: true;
  roundDate: string;
  source: string;
  repairedRows: number;
  createdPairs: number;
  createdMatchedRows: number;
  createdUnmatchedRows: number;
  preservedExistingRows: number;
  eligibleUsers: number;
  skippedUsers: number;
}

interface UserProfile {
  id: string;
  studentId?: string;
  nickname: string;
  avatarUrl: string | null;
  gender: Gender;
  grade: string;
  college: string;
  bio: string;
  role: UserRole;
  isBanned: boolean;
  isVerified: boolean;
  createdAt: string;
  lastActiveAt: string | null;
  answers: Record<string, QuestionValue>;
}

interface PlannedPair {
  left: UserProfile;
  right: UserProfile;
  score: number;
}

const DEFAULT_MAX_GRADE_DIFF = 1;
const REVEAL_UTC_HOUR = 13;
const REVEAL_UTC_MINUTE = 0;
const PAGE_SIZE = 1000;
const GRADE_ORDER = ['大一', '大二', '大三', '大四', '研一', '研二', '研三', '博士'] as const;
const CORS_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const expectedCronSecret = Deno.env.get('DAILY_MATCH_CRON_SECRET');

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for daily-match-batch function.');
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: CORS_HEADERS,
  });
}

function getTodayInChina(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function isValidRoundDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getRevealAtUtc(roundDate: string): Date {
  return new Date(`${roundDate}T${String(REVEAL_UTC_HOUR).padStart(2, '0')}:${String(REVEAL_UTC_MINUTE).padStart(2, '0')}:00.000Z`);
}

function groupAnswers(rows: ProfileAnswerRow[]): Map<string, ProfileAnswerRow[]> {
  const map = new Map<string, ProfileAnswerRow[]>();
  rows.forEach((row) => {
    const list = map.get(row.user_id) ?? [];
    list.push(row);
    map.set(row.user_id, list);
  });
  return map;
}

function toProfile(user: UserRow, answers: ProfileAnswerRow[]): UserProfile {
  return {
    id: user.id,
    studentId: user.student_id,
    nickname: user.nickname,
    avatarUrl: user.avatar_url,
    gender: user.gender,
    grade: user.grade ?? '',
    college: user.college ?? '',
    bio: user.bio ?? '',
    role: user.role,
    isBanned: user.is_banned,
    isVerified: user.is_verified,
    createdAt: user.created_at,
    lastActiveAt: user.last_active_at,
    answers: Object.fromEntries(answers.map((item) => [item.question_id, item.answer])) as Record<string, QuestionValue>,
  };
}

function isOnboardingComplete(answerMap: Record<string, QuestionValue>): boolean {
  return REQUIRED_QUESTION_IDS.every((questionId) => {
    const value = answerMap[questionId];
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(value?.toString().trim());
  });
}

function getGradeIndex(grade: string): number | null {
  const index = GRADE_ORDER.indexOf(grade as (typeof GRADE_ORDER)[number]);
  return index >= 0 ? index : null;
}

function isWithinGradeRange(userGrade: string, candidateGrade: string, maxGradeDiff: number | null): boolean {
  if (maxGradeDiff === null) return true;
  const userIndex = getGradeIndex(userGrade);
  const candidateIndex = getGradeIndex(candidateGrade);
  if (userIndex === null || candidateIndex === null) return true;
  return Math.abs(userIndex - candidateIndex) <= maxGradeDiff;
}

function getMaxGradeDiff(preference?: MatchPreferenceRow | null): number | null {
  return preference?.max_grade_diff ?? DEFAULT_MAX_GRADE_DIFF;
}

function buildBlockedMap(rows: Array<{ blocker_id: string; blocked_id: string }>): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();

  const add = (left: string, right: string) => {
    const set = map.get(left) ?? new Set<string>();
    set.add(right);
    map.set(left, set);
  };

  rows.forEach((row) => {
    add(row.blocker_id, row.blocked_id);
    add(row.blocked_id, row.blocker_id);
  });

  return map;
}

function buildExistingPartnerMap(rows: MatchRow[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();

  const add = (left: string, right: string) => {
    const set = map.get(left) ?? new Set<string>();
    set.add(right);
    map.set(left, set);
  };

  rows
    .filter((row) => row.status === 'matched')
    .forEach((row) => {
      add(row.user_a, row.user_b);
      add(row.user_b, row.user_a);
    });

  return map;
}

function isEligibleUser(profile: UserProfile, revealAt: Date): boolean {
  return !profile.isBanned
    && supportsBinaryMatching(profile.gender)
    && isOnboardingComplete(profile.answers)
    && new Date(profile.createdAt) <= revealAt;
}

function canUsersMatchByPreference(
  currentUser: UserProfile,
  candidate: UserProfile,
  currentPreference: MatchPreferenceRow | null,
  candidatePreference: MatchPreferenceRow | null,
): boolean {
  return canUsersMatchByGender(currentUser.gender, candidate.gender)
    && isWithinGradeRange(currentUser.grade, candidate.grade, getMaxGradeDiff(currentPreference))
    && isWithinGradeRange(candidate.grade, currentUser.grade, getMaxGradeDiff(candidatePreference));
}

function getCandidatePool(
  currentUser: UserProfile,
  eligibleUsers: UserProfile[],
  preferenceMap: Map<string, MatchPreferenceRow>,
  blockedMap: Map<string, Set<string>>,
  existingPartnerMap: Map<string, Set<string>>,
  reservedUserIds: Set<string>,
): UserProfile[] {
  const blockedUserIds = blockedMap.get(currentUser.id) ?? new Set<string>();
  const existingPartners = existingPartnerMap.get(currentUser.id) ?? new Set<string>();
  const currentPreference = preferenceMap.get(currentUser.id) ?? null;

  return eligibleUsers.filter((candidate) => {
    if (candidate.id === currentUser.id) return false;
    if (reservedUserIds.has(candidate.id)) return false;
    if (blockedUserIds.has(candidate.id)) return false;
    if (existingPartners.has(candidate.id)) return false;
    const candidatePreference = preferenceMap.get(candidate.id) ?? null;
    return canUsersMatchByPreference(currentUser, candidate, currentPreference, candidatePreference);
  });
}

function buildRankingMap(
  eligibleUsers: UserProfile[],
  preferenceMap: Map<string, MatchPreferenceRow>,
  blockedMap: Map<string, Set<string>>,
  existingPartnerMap: Map<string, Set<string>>,
  reservedUserIds: Set<string>,
) {
  const rankingMap = new Map<string, ReturnType<typeof rankCandidates>>();

  eligibleUsers.forEach((user) => {
    const candidatePool = getCandidatePool(user, eligibleUsers, preferenceMap, blockedMap, existingPartnerMap, reservedUserIds);
    rankingMap.set(user.id, rankCandidates(user, candidatePool));
  });

  return rankingMap;
}

function getAvailableChoices(
  rankingMap: Map<string, ReturnType<typeof rankCandidates>>,
  userId: string,
  assignedUserIds: Set<string>,
) {
  return (rankingMap.get(userId) ?? []).filter((candidate) => !assignedUserIds.has(candidate.id));
}

function planDailyPairs(
  eligibleUsers: UserProfile[],
  preferenceMap: Map<string, MatchPreferenceRow>,
  blockedMap: Map<string, Set<string>>,
  existingPartnerMap: Map<string, Set<string>>,
  reservedUserIds: Set<string>,
): { pairs: PlannedPair[]; unmatchedUserIds: string[] } {
  const availableUsers = eligibleUsers.filter((user) => !reservedUserIds.has(user.id));
  const profileMap = new Map(availableUsers.map((user) => [user.id, user]));
  const rankingMap = buildRankingMap(availableUsers, preferenceMap, blockedMap, existingPartnerMap, reservedUserIds);
  const assignedUserIds = new Set<string>();
  const pairs: PlannedPair[] = [];
  const unmatchedUserIds: string[] = [];

  const orderedUsers = [...availableUsers].sort((left, right) => {
    const leftTopScore = rankingMap.get(left.id)?.[0]?.score ?? -1;
    const rightTopScore = rankingMap.get(right.id)?.[0]?.score ?? -1;
    return rightTopScore - leftTopScore || left.id.localeCompare(right.id, 'en');
  });

  for (const user of orderedUsers) {
    if (assignedUserIds.has(user.id)) continue;

    const userChoices = getAvailableChoices(rankingMap, user.id, assignedUserIds);
    let paired = false;

    for (const candidate of userChoices) {
      if (assignedUserIds.has(candidate.id)) continue;

      const candidateChoices = getAvailableChoices(rankingMap, candidate.id, assignedUserIds);
      const candidateTopChoice = candidateChoices[0];
      if (candidateTopChoice?.id !== user.id) {
        continue;
      }

      const candidateProfile = profileMap.get(candidate.id);
      if (!candidateProfile) {
        continue;
      }

      pairs.push({
        left: user,
        right: candidateProfile,
        score: Math.round((candidate.score + candidateTopChoice.score) / 2),
      });
      assignedUserIds.add(user.id);
      assignedUserIds.add(candidate.id);
      paired = true;
      break;
    }

    if (!paired) {
      assignedUserIds.add(user.id);
      unmatchedUserIds.push(user.id);
    }
  }

  return { pairs, unmatchedUserIds };
}

async function fetchAllRows<T>(fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) throw new Error(error.message);

    const chunk = data ?? [];
    rows.push(...chunk);
    if (chunk.length < PAGE_SIZE) {
      return rows;
    }

    from += PAGE_SIZE;
  }
}

async function fetchBatchState(roundDate: string) {
  const [users, answers, preferences, blocks, matches, existingResults] = await Promise.all([
    fetchAllRows<UserRow>((from, to) => admin
      .from('users')
      .select('id,student_id,nickname,avatar_url,gender,grade,college,bio,role,is_banned,is_verified,created_at,last_active_at')
      .eq('is_banned', false)
      .order('created_at', { ascending: true })
      .range(from, to)),
    fetchAllRows<ProfileAnswerRow>((from, to) => admin
      .from('profile_answers')
      .select('user_id,question_id,answer,updated_at')
      .order('updated_at', { ascending: true })
      .range(from, to)),
    fetchAllRows<MatchPreferenceRow>((from, to) => admin
      .from('match_preferences')
      .select('user_id,max_grade_diff')
      .order('updated_at', { ascending: false })
      .range(from, to)),
    fetchAllRows<{ blocker_id: string; blocked_id: string }>((from, to) => admin
      .from('blocklist')
      .select('blocker_id,blocked_id')
      .range(from, to)),
    fetchAllRows<MatchRow>((from, to) => admin
      .from('matches')
      .select('id,user_a,user_b,status')
      .eq('status', 'matched')
      .order('matched_at', { ascending: false })
      .range(from, to)),
    fetchAllRows<DailyMatchResultRow>((from, to) => admin
      .from('daily_match_results')
      .select('id,user_id,match_date,partner_id,match_id,score,status')
      .eq('match_date', roundDate)
      .order('created_at', { ascending: true })
      .range(from, to)),
  ]);

  return { users, answers, preferences, blocks, matches, existingResults };
}

async function repairExistingMatchedRows(roundDate: string, existingResults: DailyMatchResultRow[]): Promise<DailyMatchResultRow[]> {
  const resultMap = new Map(existingResults.map((row) => [row.user_id, row]));
  const repairRows = existingResults.flatMap((row) => {
    if (row.status !== 'matched' || !row.partner_id || !row.match_id) {
      return [];
    }

    const partnerRow = resultMap.get(row.partner_id);
    if (partnerRow && partnerRow.status === 'matched' && partnerRow.partner_id === row.user_id && partnerRow.match_id === row.match_id) {
      return [];
    }

    return [{
      user_id: row.partner_id,
      match_date: roundDate,
      partner_id: row.user_id,
      match_id: row.match_id,
      score: row.score,
      status: 'matched' as const,
    }];
  });

  if (!repairRows.length) {
    return existingResults;
  }

  const { data, error } = await admin
    .from('daily_match_results')
    .upsert(repairRows, { onConflict: 'user_id,match_date' })
    .select('id,user_id,match_date,partner_id,match_id,score,status');

  if (error) throw new Error(error.message);

  const repairedRows = data ?? [];
  const merged = [...existingResults];
  repairedRows.forEach((row) => {
    const index = merged.findIndex((item) => item.user_id === row.user_id);
    if (index >= 0) {
      merged[index] = row;
    } else {
      merged.push(row);
    }
  });

  return merged;
}

async function createMatchRow(left: UserProfile, right: UserProfile, score: number): Promise<string> {
  const [userA, userB] = [left.id, right.id].sort();
  const { data, error } = await admin
    .from('matches')
    .upsert(
      {
        user_a: userA,
        user_b: userB,
        score,
        status: 'matched',
        matched_at: new Date().toISOString(),
      },
      { onConflict: 'user_a,user_b' },
    )
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

async function persistRoundResults(roundDate: string, pairs: PlannedPair[], unmatchedUserIds: string[]) {
  const matchedRows: Array<{
    user_id: string;
    match_date: string;
    partner_id: string;
    match_id: string;
    score: number;
    status: 'matched';
  }> = [];

  for (const pair of pairs) {
    const matchId = await createMatchRow(pair.left, pair.right, pair.score);
    matchedRows.push(
      {
        user_id: pair.left.id,
        match_date: roundDate,
        partner_id: pair.right.id,
        match_id: matchId,
        score: pair.score,
        status: 'matched',
      },
      {
        user_id: pair.right.id,
        match_date: roundDate,
        partner_id: pair.left.id,
        match_id: matchId,
        score: pair.score,
        status: 'matched',
      },
    );
  }

  if (matchedRows.length) {
    const { error } = await admin.from('daily_match_results').upsert(matchedRows, { onConflict: 'user_id,match_date' });
    if (error) throw new Error(error.message);
  }

  const unmatchedRows = unmatchedUserIds.map((userId) => ({
    user_id: userId,
    match_date: roundDate,
    score: 0,
    status: 'unmatched' as const,
  }));

  if (unmatchedRows.length) {
    const { error } = await admin.from('daily_match_results').upsert(unmatchedRows, { onConflict: 'user_id,match_date' });
    if (error) throw new Error(error.message);
  }

  return {
    matchedRows: matchedRows.length,
    unmatchedRows: unmatchedRows.length,
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed. Use POST.' });
  }

  if (!expectedCronSecret) {
    return jsonResponse(500, { ok: false, error: 'Missing DAILY_MATCH_CRON_SECRET in Edge Function secrets.' });
  }

  const providedSecret = request.headers.get('x-cron-secret');
  if (providedSecret !== expectedCronSecret) {
    return jsonResponse(401, { ok: false, error: 'Invalid cron secret.' });
  }

  let payload: FunctionPayload = {};
  try {
    payload = (await request.json()) as FunctionPayload;
  } catch {
    payload = {};
  }

  const roundDate = payload.roundDate && isValidRoundDate(payload.roundDate)
    ? payload.roundDate
    : getTodayInChina();
  const source = payload.source ?? 'cron';
  const revealAt = getRevealAtUtc(roundDate);

  try {
    const { users, answers, preferences, blocks, matches, existingResults } = await fetchBatchState(roundDate);
    const repairedResults = await repairExistingMatchedRows(roundDate, existingResults);
    const answersByUserId = groupAnswers(answers);
    const profiles = users.map((user) => toProfile(user, answersByUserId.get(user.id) ?? []));
    const preferenceMap = new Map(preferences.map((preference) => [preference.user_id, preference]));
    const blockedMap = buildBlockedMap(blocks);
    const existingPartnerMap = buildExistingPartnerMap(matches);
    const reservedUserIds = new Set(repairedResults.map((row) => row.user_id));
    const eligibleUsers = profiles.filter((profile) => isEligibleUser(profile, revealAt));
    const skippedUsers = profiles.length - eligibleUsers.length;

    const { pairs, unmatchedUserIds } = planDailyPairs(
      eligibleUsers,
      preferenceMap,
      blockedMap,
      existingPartnerMap,
      reservedUserIds,
    );

    const persisted = await persistRoundResults(roundDate, pairs, unmatchedUserIds);

    const response: FunctionResponse = {
      ok: true,
      roundDate,
      source,
      repairedRows: repairedResults.length - existingResults.length,
      createdPairs: pairs.length,
      createdMatchedRows: persisted.matchedRows,
      createdUnmatchedRows: persisted.unmatchedRows,
      preservedExistingRows: repairedResults.length,
      eligibleUsers: eligibleUsers.length,
      skippedUsers,
    };

    console.log(JSON.stringify(response));
    return jsonResponse(200, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown daily match batch error.';
    console.error(message);
    return jsonResponse(500, {
      ok: false,
      roundDate,
      source,
      error: message,
    });
  }
});
