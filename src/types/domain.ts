import type { QuestionValue } from './question';

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_say';
export type UserRole = 'user' | 'admin';
export type InteractionAction = 'like' | 'skip';
export type MatchStatus = 'matched' | 'unmatched';
export type ReportReason = 'harassment' | 'fake' | 'spam' | 'nsfw' | 'other';
export type ToastTone = 'info' | 'success' | 'error';
export type MatchConstraintReason = 'daily_match_limit' | 'gender_restricted';
export type ContactType = 'wechat' | 'qq' | 'phone' | 'xiaohongshu' | 'other';
export type ContactExchangeStatus = 'waiting_me' | 'waiting_them' | 'both_shared';
export type DailyMatchResultStatus = 'matched' | 'unmatched';
export type DailyMatchPhase = 'waiting' | 'processing' | 'matched' | 'unmatched' | 'complete_profile' | 'gender_restricted';

export interface UserRecord {
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

export interface ProfileAnswerRecord {
  id: string;
  user_id: string;
  question_id: string;
  answer: QuestionValue;
  updated_at: string;
}

export interface UserProfile {
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

export interface RecommendationCandidate extends UserProfile {
  score: number;
  tags: string[];
}

export interface MatchRecord {
  id: string;
  user_a: string;
  user_b: string;
  score: number;
  status: MatchStatus;
  created_at: string;
  matched_at: string | null;
}

export interface MatchWithProfile {
  id: string;
  score: number;
  status: MatchStatus;
  createdAt: string;
  matchedAt: string | null;
  partner: UserProfile;
}

export interface InteractionResult {
  matched: boolean;
  matchId?: string;
  reason?: MatchConstraintReason;
}

export interface MatchPreferenceRecord {
  user_id: string;
  max_grade_diff: number | null;
  reminder_enabled: boolean;
  reminder_hour: number;
  reminder_minute: number;
  created_at: string;
  updated_at: string;
}

export interface MatchPreferences {
  maxGradeDiff: number | null;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
}

export interface DailyMatchResultRecord {
  id: string;
  user_id: string;
  match_date: string;
  partner_id: string | null;
  match_id: string | null;
  score: number;
  status: DailyMatchResultStatus;
  created_at: string;
}

export interface DailyMatchSnapshot {
  phase: DailyMatchPhase;
  roundDate: string;
  nextMatchAt: string;
  preferences: MatchPreferences;
  match: MatchWithProfile | null;
  title: string;
  description: string;
}

export interface ContactShareRecord {
  id: string;
  match_id: string;
  user_id: string;
  contact_type: ContactType;
  contact_value: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactShareSummary {
  matchId: string;
  myContactType: ContactType | null;
  myContactValue: string | null;
  myIsShared: boolean;
  partnerIsShared: boolean;
  partnerContactType: ContactType | null;
  partnerContactValue: string | null;
  status: ContactExchangeStatus;
}

export interface MessageRecord {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export interface MessageWithMeta extends MessageRecord {
  isMine: boolean;
  status?: 'sending' | 'failed' | 'sent';
}

export interface ReportRecord {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: ReportReason;
  detail: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface BlocklistRecord {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface ToastMessage {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
}
