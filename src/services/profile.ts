import { REQUIRED_QUESTION_IDS } from '../data/questions';
import type { ProfileAnswerRecord, UserProfile, UserRecord } from '../types/domain';
import type { Answer, QuestionValue } from '../types/question';
import { getSupabase } from './supabase';

function mapUserProfile(user: UserRecord, answers: ProfileAnswerRecord[]): UserProfile {
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

function sanitizePublicProfile(profile: UserProfile): UserProfile {
  return {
    ...profile,
    studentId: undefined,
  };
}

async function fetchAnswersForUserIds(userIds: string[]): Promise<Record<string, ProfileAnswerRecord[]>> {
  if (!userIds.length) return {};

  const supabase = getSupabase();
  const { data, error } = await supabase.from('profile_answers').select('*').in('user_id', userIds);
  if (error) throw error;

  return (data ?? []).reduce<Record<string, ProfileAnswerRecord[]>>((acc, row) => {
    const item = row as ProfileAnswerRecord;
    acc[item.user_id] ??= [];
    acc[item.user_id].push(item);
    return acc;
  }, {});
}

export function isOnboardingCompleteFromAnswers(answerMap: Record<string, QuestionValue>): boolean {
  return REQUIRED_QUESTION_IDS.every((questionId) => {
    const value = answerMap[questionId];
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(value?.toString().trim());
  });
}

export async function fetchCurrentUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabase();
  const { data: user, error: userError } = await supabase.from('users').select('*').eq('id', userId).single();
  if (userError) throw userError;
  if (!user) return null;

  const answerMap = await fetchAnswersForUserIds([userId]);
  return mapUserProfile(user as UserRecord, answerMap[userId] ?? []);
}

export async function fetchProfilesByIds(userIds: string[], options?: { sanitize?: boolean }): Promise<UserProfile[]> {
  if (!userIds.length) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase.from('users').select('*').in('id', userIds).eq('is_banned', false);
  if (error) throw error;

  const answersByUserId = await fetchAnswersForUserIds(userIds);
  const profiles = (data ?? []).map((row) => mapUserProfile(row as UserRecord, answersByUserId[(row as UserRecord).id] ?? []));
  return options?.sanitize ? profiles.map(sanitizePublicProfile) : profiles;
}

export async function fetchPublicProfile(userId: string): Promise<UserProfile | null> {
  const [profile] = await fetchProfilesByIds([userId], { sanitize: true });
  return profile ?? null;
}

export async function listCandidateProfiles(userId: string): Promise<UserProfile[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('users').select('*').neq('id', userId).eq('is_banned', false);
  if (error) throw error;

  const userIds = (data ?? []).map((row) => (row as UserRecord).id);
  const answersByUserId = await fetchAnswersForUserIds(userIds);

  return (data ?? []).map((row) => sanitizePublicProfile(mapUserProfile(row as UserRecord, answersByUserId[(row as UserRecord).id] ?? [])));
}

export async function saveAnswers(userId: string, answers: Answer[]): Promise<void> {
  const supabase = getSupabase();
  const payload = answers.map((answer) => ({ user_id: userId, question_id: answer.questionId, answer: answer.value }));
  const { error } = await supabase.from('profile_answers').upsert(payload, { onConflict: 'user_id,question_id' });
  if (error) throw error;
}

export async function updateUserProfile(userId: string, payload: Partial<Pick<UserRecord, 'nickname' | 'bio' | 'avatar_url' | 'grade' | 'college' | 'is_verified' | 'last_active_at'>>): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('users').update(payload).eq('id', userId);
  if (error) throw error;
}

export async function bootstrapUserProfile(userId: string, payload: Pick<UserRecord, 'student_id' | 'nickname' | 'gender'>): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('users')
    .update({
      student_id: payload.student_id,
      nickname: payload.nickname,
      gender: payload.gender,
      is_verified: false,
    })
    .eq('id', userId);

  if (error) throw error;
}

export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const profile = await fetchCurrentUserProfile(userId);
  return profile ? isOnboardingCompleteFromAnswers(profile.answers) : false;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = getSupabase();
  const blob = await compressImage(file);
  const filePath = `avatars/${userId}.webp`;
  const { error } = await supabase.storage.from('avatars').upload(filePath, blob, {
    contentType: 'image/webp',
    cacheControl: '3600',
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  await updateUserProfile(userId, { avatar_url: data.publicUrl });
  return data.publicUrl;
}

async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const maxSize = 400;
  const ratio = Math.min(maxSize / bitmap.width, maxSize / bitmap.height, 1);
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('浏览器暂不支持图片压缩。');
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('头像压缩失败，请换一张图片试试。'));
          return;
        }
        resolve(blob);
      },
      'image/webp',
      0.82,
    );
  });
}

export function toAnswerArray(answerMap: Record<string, QuestionValue>): Answer[] {
  return Object.entries(answerMap).map(([questionId, value]) => ({ questionId, value }));
}

