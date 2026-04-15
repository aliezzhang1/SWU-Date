import type { ContactExchangeStatus, ContactShareRecord, ContactShareSummary, ContactType } from '../types/domain';
import { getSupabase } from './supabase';

interface ContactShareSummaryRow {
  match_id: string;
  my_contact_type: ContactType | null;
  my_contact_value: string | null;
  my_is_shared: boolean | null;
  partner_is_shared: boolean | null;
  partner_contact_type: ContactType | null;
  partner_contact_value: string | null;
}

export const CONTACT_TYPE_OPTIONS: Array<{ value: ContactType; label: string; placeholder: string }> = [
  { value: 'wechat', label: '微信号', placeholder: '例如：swu_spring' },
  { value: 'qq', label: 'QQ', placeholder: '例如：123456789' },
  { value: 'phone', label: '手机号', placeholder: '例如：13800138000' },
  { value: 'xiaohongshu', label: '小红书', placeholder: '例如：西大散步选手' },
  { value: 'other', label: '其他方式', placeholder: '例如：邮箱 / Telegram / 备注方式' },
];

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = Object.fromEntries(
  CONTACT_TYPE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<ContactType, string>;

function toStatus(myIsShared: boolean, partnerIsShared: boolean): ContactExchangeStatus {
  if (myIsShared && partnerIsShared) return 'both_shared';
  if (myIsShared) return 'waiting_them';
  return 'waiting_me';
}

function toSummary(row: ContactShareSummaryRow): ContactShareSummary {
  const myIsShared = Boolean(row.my_is_shared);
  const partnerIsShared = Boolean(row.partner_is_shared);

  return {
    matchId: row.match_id,
    myContactType: row.my_contact_type,
    myContactValue: row.my_contact_value,
    myIsShared,
    partnerIsShared,
    partnerContactType: row.partner_contact_type,
    partnerContactValue: row.partner_contact_value,
    status: toStatus(myIsShared, partnerIsShared),
  };
}

export function getContactTypeLabel(type: ContactType | null | undefined): string {
  if (!type) return '联系方式';
  return CONTACT_TYPE_LABELS[type] ?? '联系方式';
}

export function getContactShareStatusLabel(summary: ContactShareSummary): string {
  switch (summary.status) {
    case 'both_shared':
      return '双方都同意展示联系方式';
    case 'waiting_them':
      return '你已授权，等待对方';
    case 'waiting_me':
    default:
      return summary.partnerIsShared ? '对方已经同意，就差你点头' : '等待你决定是否展示联系方式';
  }
}

export function getContactShareStatusDescription(summary: ContactShareSummary): string {
  switch (summary.status) {
    case 'both_shared':
      return '双方都愿意继续认识彼此，联系方式已经解锁。';
    case 'waiting_them':
      return '你已经点头了，等对方也愿意公开后，双方才会看到彼此的联系方式。';
    case 'waiting_me':
    default:
      return summary.partnerIsShared
        ? '对方已经愿意展示联系方式了，轮到你决定是否公开自己的联系方式。'
        : '匹配只是第一步，双方还需要各自单独同意展示联系方式。';
  }
}

export async function getContactShareSummaries(): Promise<Record<string, ContactShareSummary>> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_my_contact_share_summaries');

  if (error) throw error;

  const rows = (data ?? []) as ContactShareSummaryRow[];
  return rows.reduce((acc: Record<string, ContactShareSummary>, row) => {
    const summary = toSummary(row);
    acc[summary.matchId] = summary;
    return acc;
  }, {});
}

export async function getContactShareSummary(matchId: string): Promise<ContactShareSummary> {
  const summaries = await getContactShareSummaries();
  return summaries[matchId] ?? {
    matchId,
    myContactType: null,
    myContactValue: null,
    myIsShared: false,
    partnerIsShared: false,
    partnerContactType: null,
    partnerContactValue: null,
    status: 'waiting_me',
  };
}

export async function shareMyContact(matchId: string, userId: string, contactType: ContactType, contactValue: string): Promise<ContactShareRecord> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('contact_shares')
    .upsert(
      {
        match_id: matchId,
        user_id: userId,
        contact_type: contactType,
        contact_value: contactValue.trim(),
        is_shared: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'match_id,user_id' },
    )
    .select('*')
    .single();

  if (error) throw error;
  return data as ContactShareRecord;
}

export async function revokeMyContactShare(matchId: string, userId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('contact_shares')
    .update({ is_shared: false, updated_at: new Date().toISOString() })
    .eq('match_id', matchId)
    .eq('user_id', userId);

  if (error) throw error;
}

