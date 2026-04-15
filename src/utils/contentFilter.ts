import { SENSITIVE_WORD_GROUPS, WARNING_PATTERNS, type SensitiveCategory } from '../data/sensitiveWords';

export interface FilterResult {
  isBlocked: boolean;
  isWarning: boolean;
  reason: string;
  matchedKeywords: string[];
}

const EMPTY_RESULT: FilterResult = {
  isBlocked: false,
  isWarning: false,
  reason: '',
  matchedKeywords: [],
};

const CATEGORY_ORDER: SensitiveCategory[] = ['abuse', 'sexual', 'spam', 'fraud'];

function normalizeText(input: string): string {
  return input
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]/g, '');
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function buildBlockedReason(categories: SensitiveCategory[]): string {
  if (categories.length === 1) {
    return SENSITIVE_WORD_GROUPS[categories[0]].reason;
  }

  const labels = categories.map((category) => SENSITIVE_WORD_GROUPS[category].label);
  return `消息同时命中了${labels.join('、')}，暂时无法发送。`;
}

export function filterContent(content: string): FilterResult {
  const raw = content.trim();
  if (!raw) {
    return { ...EMPTY_RESULT };
  }

  const normalizedContent = normalizeText(raw);
  const matchedCategories: SensitiveCategory[] = [];
  const matchedKeywords: string[] = [];

  CATEGORY_ORDER.forEach((category) => {
    const group = SENSITIVE_WORD_GROUPS[category];
    const groupMatches = group.keywords.filter((keyword) => {
      const normalizedKeyword = normalizeText(keyword);
      return normalizedKeyword.length > 0 && normalizedContent.includes(normalizedKeyword);
    });

    if (groupMatches.length > 0) {
      matchedCategories.push(category);
      matchedKeywords.push(...groupMatches);
    }
  });

  if (matchedCategories.length > 0) {
    return {
      isBlocked: true,
      isWarning: false,
      reason: buildBlockedReason(unique(matchedCategories)),
      matchedKeywords: unique(matchedKeywords),
    };
  }

  const phoneMatches = Array.from(raw.normalize('NFKC').matchAll(WARNING_PATTERNS.phone), (match) => match[0]);
  if (phoneMatches.length > 0) {
    return {
      isBlocked: false,
      isWarning: true,
      reason: '为了保护隐私，建议不要直接发送手机号等个人联系方式。',
      matchedKeywords: unique(phoneMatches),
    };
  }

  return { ...EMPTY_RESULT };
}
