import type { Gender, RecommendationCandidate, UserProfile } from '../types/domain';
import type { QuestionValue } from '../types/question';

interface MatchContext {
  interactedUserIds?: Set<string>;
  blockedUserIds?: Set<string>;
}

type CompatibilityCategory = 'campus' | 'rhythm' | 'personality' | 'values' | 'date' | 'lifestyle' | 'firstImpression';

interface CompatibilityReason {
  category: CompatibilityCategory;
  weight: number;
  text: string;
}

interface ScoreAccumulator {
  score: number;
  total: number;
}

interface SoftSimilarityConfig {
  neutral?: string[];
  closePairs?: Array<[string, string]>;
  mismatch?: number;
  neutralValue?: number;
  closeValue?: number;
}

export interface CompatibilityInsight {
  headline: string;
  summary: string;
  reasons: string[];
}

const MBTI_GROUPS: Record<string, string[]> = {
  diplomats: ['INFJ', 'INFP', 'ENFJ', 'ENFP'],
  analysts: ['INTJ', 'INTP', 'ENTJ', 'ENTP'],
  sentinels: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'],
  explorers: ['ISTP', 'ISFP', 'ESTP', 'ESFP'],
};

const MBTI_GROUP_LABELS: Record<string, string> = {
  diplomats: '更偏共情和理想感的类型',
  analysts: '更偏理性分析和脑洞表达的类型',
  sentinels: '更偏稳定可靠、重视现实感的类型',
  explorers: '更偏行动感和体验感的类型',
};

const CATEGORY_LABELS: Record<CompatibilityCategory, string> = {
  campus: '校园生活半径',
  rhythm: '生活节奏',
  personality: '性格表达',
  values: '关系期待',
  date: '见面方式',
  lifestyle: '生活偏好',
  firstImpression: '第一眼偏好',
};

function pairKey(left: string, right: string): string {
  return [left, right].sort().join('::');
}

const SMOKING_PAIR_SCORES: Record<string, number> = {
  [pairKey('自己会抽', '不介意对方偶尔抽')]: 0.5,
  [pairKey('自己会抽', '希望对方不抽')]: 0.1,
  [pairKey('自己会抽', '完全不能接受')]: 0,
  [pairKey('不介意对方偶尔抽', '希望对方不抽')]: 0.55,
  [pairKey('不介意对方偶尔抽', '完全不能接受')]: 0.35,
  [pairKey('希望对方不抽', '完全不能接受')]: 0.75,
};

const DRINKING_PAIR_SCORES: Record<string, number> = {
  [pairKey('小酌很加分', '聚会喝一点可以')]: 0.75,
  [pairKey('小酌很加分', '基本不喝')]: 0.3,
  [pairKey('小酌很加分', '不希望另一半常喝')]: 0.35,
  [pairKey('聚会喝一点可以', '基本不喝')]: 0.65,
  [pairKey('聚会喝一点可以', '不希望另一半常喝')]: 0.6,
  [pairKey('基本不喝', '不希望另一半常喝')]: 0.75,
};

const SPENDING_PAIR_SCORES: Record<string, number> = {
  [pairKey('愿意为体验花钱', '该花花该省省')]: 0.7,
  [pairKey('计划型消费更安心', '该花花该省省')]: 0.75,
  [pairKey('计划型消费更安心', '学生党预算优先')]: 0.8,
  [pairKey('该花花该省省', '学生党预算优先')]: 0.7,
  [pairKey('愿意为体验花钱', '学生党预算优先')]: 0.25,
};

const RELATIONSHIP_GOAL_PAIR_SCORES: Record<string, number> = {
  [pairKey('认真稳定发展', '先认识慢慢看')]: 0.7,
  [pairKey('先认识慢慢看', '轻松陪伴但别太绑')]: 0.55,
  [pairKey('先认识慢慢看', '暂时不想下太重定义')]: 0.6,
  [pairKey('轻松陪伴但别太绑', '暂时不想下太重定义')]: 0.7,
  [pairKey('认真稳定发展', '轻松陪伴但别太绑')]: 0.25,
};

const CONFLICT_PAIR_SCORES: Record<string, number> = {
  [pairKey('最好当天说开', '先冷静一下再聊')]: 0.5,
  [pairKey('先冷静一下再聊', '能不吵就尽量不吵')]: 0.6,
  [pairKey('希望对方先来沟通', '能不吵就尽量不吵')]: 0.45,
  [pairKey('最好当天说开', '希望对方先来沟通')]: 0.35,
};

const REASSURANCE_PAIR_SCORES: Record<string, number> = {
  [pairKey('经常表达会更安心', '看状态就好')]: 0.55,
  [pairKey('稳定行动比嘴上更重要', '不需要太频繁确认')]: 0.75,
  [pairKey('稳定行动比嘴上更重要', '看状态就好')]: 0.65,
  [pairKey('不需要太频繁确认', '看状态就好')]: 0.7,
};

const AMBITION_PAIR_SCORES: Record<string, number> = {
  [pairKey('一起冲目标会很有力量', '一忙一稳互相补位也很好')]: 0.7,
  [pairKey('一忙一稳互相补位也很好', '工作生活平衡最重要')]: 0.75,
  [pairKey('工作生活平衡最重要', '先把当下过好更现实')]: 0.8,
  [pairKey('一起冲目标会很有力量', '工作生活平衡最重要')]: 0.45,
};

const FAMILY_PAIR_SCORES: Record<string, number> = {
  [pairKey('和家人很亲近，会常聊', '重要的事会沟通')]: 0.75,
  [pairKey('重要的事会沟通', '看阶段和具体情况')]: 0.7,
  [pairKey('更独立，少汇报', '看阶段和具体情况')]: 0.7,
  [pairKey('和家人很亲近，会常聊', '更独立，少汇报')]: 0.2,
};

const REPLY_PAIR_SCORES: Record<string, number> = {
  [pairKey('看到会尽快回', '忙完集中回')]: 0.55,
  [pairKey('忙完集中回', '熟了才会回得快')]: 0.65,
  [pairKey('熟了才会回得快', '不太喜欢一直挂在线上')]: 0.7,
  [pairKey('忙完集中回', '不太喜欢一直挂在线上')]: 0.75,
};

const CHAT_FREQUENCY_PAIR_SCORES: Record<string, number> = {
  [pairKey('每天都聊一点', '隔几天深聊一次')]: 0.45,
  [pairKey('隔几天深聊一次', '见面比线上更重要')]: 0.6,
  [pairKey('见面比线上更重要', '顺其自然最好')]: 0.65,
  [pairKey('隔几天深聊一次', '顺其自然最好')]: 0.7,
};

const DIRECTNESS_PAIR_SCORES: Record<string, number> = {
  [pairKey('会很直接表达', '会委婉一点')]: 0.6,
  [pairKey('会委婉一点', '先观察再说')]: 0.7,
  [pairKey('先观察再说', '写文字比当面更容易')]: 0.65,
  [pairKey('会委婉一点', '写文字比当面更容易')]: 0.55,
};
const PERSONAL_SPACE_PAIR_SCORES: Record<string, number> = {
  [pairKey('很需要各自空间', '亲密和独处都要')]: 0.75,
  [pairKey('亲密和独处都要', '更喜欢黏一点')]: 0.6,
  [pairKey('亲密和独处都要', '看关系阶段再调整')]: 0.75,
  [pairKey('更喜欢黏一点', '看关系阶段再调整')]: 0.65,
};

const PUBLIC_AFFECTION_PAIR_SCORES: Record<string, number> = {
  [pairKey('自然公开没问题', '偶尔出现一下就好')]: 0.65,
  [pairKey('偶尔出现一下就好', '线下亲密线上低调')]: 0.8,
  [pairKey('线下亲密线上低调', '希望尽量私密')]: 0.8,
  [pairKey('自然公开没问题', '希望尽量私密')]: 0.1,
};

const SOCIAL_MEDIA_PAIR_SCORES: Record<string, number> = {
  [pairKey('愿意公开互动', '低调但不刻意隐藏')]: 0.65,
  [pairKey('低调但不刻意隐藏', '看对方舒不舒服')]: 0.8,
  [pairKey('完全没必要公开', '看对方舒不舒服')]: 0.7,
  [pairKey('愿意公开互动', '完全没必要公开')]: 0.15,
};

const TRAVEL_STYLE_PAIR_SCORES: Record<string, number> = {
  [pairKey('提前规划路线最安心', '更想先从学校附近慢慢逛')]: 0.55,
  [pairKey('说走就走最快乐', '有人带路就很开心')]: 0.7,
  [pairKey('有人带路就很开心', '更想先从学校附近慢慢逛')]: 0.65,
  [pairKey('提前规划路线最安心', '有人带路就很开心')]: 0.5,
};

const NO_HEIGHT_PREFERENCE = '没有明确偏好';

function getHeightRangeCenter(value: string): number | null {
  const match = /^(\d{3})-(\d{3})cm$/.exec(value);
  if (!match) return null;
  return (Number(match[1]) + Number(match[2])) / 2;
}

function heightPreferenceSimilarity(actualHeightRange: string, preferredHeightRange: string): number | null {
  if (!actualHeightRange || !preferredHeightRange || preferredHeightRange === NO_HEIGHT_PREFERENCE) return null;
  const actualCenter = getHeightRangeCenter(actualHeightRange);
  const preferredCenter = getHeightRangeCenter(preferredHeightRange);
  if (actualCenter === null || preferredCenter === null) return null;

  const distance = Math.abs(actualCenter - preferredCenter);
  if (distance === 0) return 1;
  if (distance <= 10) return 0.7;
  if (distance <= 20) return 0.35;
  return 0.1;
}

function getAnswer(profile: UserProfile, key: string): QuestionValue | undefined {
  return profile.answers[key];
}

function getSingle(profile: UserProfile, key: string): string {
  const value = getAnswer(profile, key);
  return typeof value === 'string' ? value : '';
}

function getMulti(profile: UserProfile, key: string): string[] {
  const value = getAnswer(profile, key);
  return Array.isArray(value) ? value : [];
}

function intersection(left: string[], right: string[]): string[] {
  if (!left.length || !right.length) return [];
  const rightSet = new Set(right);
  return [...new Set(left.filter((item) => rightSet.has(item)))];
}

function jaccardScore(left: string[], right: string[]): number {
  if (!left.length || !right.length) return 0;
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const overlap = [...leftSet].filter((item) => rightSet.has(item)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : overlap / union;
}

function stableJitter(seed: string): number {
  const hash = [...seed].reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 3), 0);
  return (hash % 5) - 2;
}

function joinReadable(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]}和${items[1]}`;
  return `${items.slice(0, -1).join('、')}和${items[items.length - 1]}`;
}

function getMbtiGroup(value: string): string | null {
  return Object.entries(MBTI_GROUPS).find(([, group]) => group.includes(value))?.[0] ?? null;
}

function exactSimilarity(current: string, candidate: string): number | null {
  if (!current || !candidate) return null;
  return current === candidate ? 1 : 0;
}

function mappedSimilarity(current: string, candidate: string, pairScores: Record<string, number>, fallback = 0.25): number | null {
  if (!current || !candidate) return null;
  if (current === candidate) return 1;
  return pairScores[pairKey(current, candidate)] ?? fallback;
}

function softSimilarity(current: string, candidate: string, config: SoftSimilarityConfig = {}): number | null {
  if (!current || !candidate) return null;
  if (current === candidate) return 1;

  const { neutral = [], closePairs = [], mismatch = 0.25, neutralValue = 0.65, closeValue = 0.55 } = config;

  if (neutral.includes(current) || neutral.includes(candidate)) return neutralValue;
  if (closePairs.some(([left, right]) => pairKey(left, right) === pairKey(current, candidate))) return closeValue;
  return mismatch;
}

function hometownSimilarity(current: string, candidate: string): number | null {
  if (!current || !candidate) return null;
  if (current === candidate) return 1;
  if ((current === '重庆本地' && candidate === '西南地区') || (current === '西南地区' && candidate === '重庆本地')) return 0.8;
  const mainland = ['重庆本地', '西南地区', '华中 / 华东', '华北 / 东北', '华南 / 西北'];
  if (mainland.includes(current) && mainland.includes(candidate)) return 0.35;
  return 0.2;
}

function mbtiSimilarity(current: string, candidate: string): number | null {
  if (!current || !candidate) return null;
  if (current === '不知道' || candidate === '不知道') return 0.45;
  if (current === candidate) return 1;
  const currentGroup = getMbtiGroup(current);
  const candidateGroup = getMbtiGroup(candidate);
  if (currentGroup && currentGroup === candidateGroup) return 0.78;
  if (current.slice(1) === candidate.slice(1)) return 0.68;
  return 0.35;
}

function distanceSimilarity(current: string, candidate: string): number | null {
  return softSimilarity(current, candidate, { neutral: ['看缘分和具体情况'], neutralValue: 0.65, mismatch: 0.15 });
}

function partnerPreferenceSimilarity(current: string, candidate: string): number | null {
  return softSimilarity(current, candidate, { neutral: ['都可以'], neutralValue: 0.7, mismatch: 0.2 });
}

function dietSimilarity(current: string, candidate: string): number | null {
  return softSimilarity(current, candidate, {
    closePairs: [
      ['啥都吃', '偏辣党'],
      ['啥都吃', '偏清淡'],
      ['啥都吃', '素食友好'],
      ['啥都吃', '对甜品毫无抵抗力'],
      ['偏清淡', '素食友好'],
      ['偏清淡', '对甜品毫无抵抗力'],
      ['偏辣党', '对甜品毫无抵抗力'],
    ],
    closeValue: 0.7,
    mismatch: 0.25,
  });
}

function addMetric(accumulator: ScoreAccumulator, weight: number, similarity: number | null): void {
  if (similarity === null) return;
  accumulator.score += similarity * weight;
  accumulator.total += weight;
}

export function supportsBinaryMatching(gender: Gender): boolean {
  return gender === 'male' || gender === 'female';
}

export function canUsersMatchByGender(currentGender: Gender, candidateGender: Gender): boolean {
  return supportsBinaryMatching(currentGender) && supportsBinaryMatching(candidateGender) && currentGender !== candidateGender;
}

function buildSharedSingleReason(key: string, value: string): CompatibilityReason | null {
  if (!value) return null;

  switch (key) {
    case 'campusMode':
      return {
        category: 'campus',
        weight: 5,
        text: value === '课业主线型'
          ? '你们最近都把不少重心放在课业上，时间安排和阶段压力会更容易互相理解。'
          : value === '社团活动型'
            ? '你们都习惯在校园里保持参与感，很多认识彼此的机会会更自然发生。'
            : value === '实习准备型'
              ? '你们都在为下一阶段做准备，很多现实考虑会更容易聊到一起。'
              : '你们都习惯在几条线之间切换，会更懂彼此为什么有时忙、有时松。',
      };
    case 'circleStyle':
      return {
        category: 'personality',
        weight: 4,
        text: value === '固定小圈子最舒服'
          ? '你们都更珍惜稳定的小圈子，相处通常会偏踏实，不太需要用热闹来证明关系。'
          : value === '多个圈子切换'
            ? '你们都能在不同圈子之间切换，见面的场景和话题都比较容易打开。'
            : value === '认识的人不少但很挑熟'
              ? '你们都不是谁都轻易走近的人，一旦熟起来，通常会更认真。'
              : '你们都愿意让关系自然长出来，不太会把认识这件事搞得很有压力。',
      };
    case 'weekend':
      return {
        category: 'rhythm',
        weight: 6,
        text: value === '宅家充电'
          ? '你们周末都更会给自己留恢复能量的空间，相处不会太吵，也不容易互相消耗。'
          : value === '出门探索'
            ? '你们都喜欢往外走，见面和约会很容易自然发生，不太需要人硬拽着出门。'
            : '你们都不爱被固定模板绑住，临时起意的安排反而更可能有火花。',
      };
    case 'schedule':
      return {
        category: 'rhythm',
        weight: 6,
        text: value === '早睡早起'
          ? '你们的作息都偏规律，聊天、见面和日常陪伴的时间更容易对得上。'
          : value === '夜猫子'
            ? '你们都偏夜猫子，深夜聊天和晚间陪伴感通常会更容易出现。'
            : '你们都能适应校园节奏的波动，相处不会太依赖某个固定时间点。',
      };
    case 'energy':
      return {
        category: 'personality',
        weight: 7,
        text: value === 'I 人慢热型'
          ? '你们都偏慢热，适合从轻松聊天慢慢熟起来，不会互相催着马上进入状态。'
          : value === 'E 人外放型'
            ? '你们都愿意主动打开话题，见面时通常不容易冷场。'
            : '你们都能看场合切换状态，既能热闹也能安静，相处弹性很大。',
      };
    case 'exercise':
      return {
        category: 'lifestyle',
        weight: 4,
        text: value === '经常运动'
          ? '你们的运动频率接近，一起散步、跑步或去操场都不会显得突兀。'
          : value === '偶尔动一动'
            ? '你们都属于轻运动派，相处方式不会给彼此太多体能压力。'
            : '你们都偏松弛派，宅着聊天、随性见面也能很舒服。',
      };
    case 'pets':
      return {
        category: 'lifestyle',
        weight: 4,
        text: value === '超爱'
          ? '你们都对宠物很有好感，这类生活话题通常很容易聊开。'
          : value === '无感'
            ? '你们对宠物都比较平常心，生活偏好上不太容易卡住。'
            : '你们都能理解彼此对宠物边界的在意，相处时会更容易体谅。',
      };
    case 'socialFrequency':
      return {
        category: 'rhythm',
        weight: 5,
        text: value === '几乎每天都想和人连接'
          ? '你们都喜欢高频一点的连接感，关系里的存在感会更容易被感受到。'
          : value === '有活动就愿意出现'
            ? '你们都属于有活动就愿意出现的人，临时约一约也不太容易拖很久。'
            : value === '小范围稳定联系就够了'
              ? '你们都更珍惜稳定的小范围连接，相处往往更踏实而不是热闹型。'
              : '你们都需要不少独处来恢复能量，边界感会更自然被理解。',
      };
    case 'smoking':
      return {
        category: 'lifestyle',
        weight: 6,
        text: value === '自己会抽'
          ? '你们对烟味和相关社交场景的接受度接近，这类生活习惯不太容易突然成为雷点。'
          : value === '不介意对方偶尔抽'
            ? '你们对抽烟这件事的容忍度接近，边界比较容易提前对齐。'
            : value === '希望对方不抽'
              ? '你们都更偏好无烟的相处环境，生活习惯上的舒服感会更一致。'
              : '你们对抽烟边界都比较明确，这类生活细节不容易在后期变成大问题。',
      };
    case 'drinking':
      return {
        category: 'lifestyle',
        weight: 4,
        text: value === '小酌很加分'
          ? '你们都接受带一点仪式感的小酌，聚会和约会的氛围感会比较像。'
          : value === '聚会喝一点可以'
            ? '你们对喝酒都偏轻松，不会把这件事看得太重。'
            : value === '基本不喝'
              ? '你们都不太依赖酒精做社交润滑，相处会更偏日常和清醒。'
              : '你们都更在意喝酒频率和边界，很多生活习惯会更容易提前说清楚。',
      };
    case 'spendingStyle':
      return {
        category: 'lifestyle',
        weight: 4,
        text: value === '愿意为体验花钱'
          ? '你们都愿意把预算花在体验上，一起出去玩时更容易一拍即合。'
          : value === '计划型消费更安心'
            ? '你们都更看重消费上的可控感，相处时不会因为花钱节奏差太多而别扭。'
            : value === '该花花该省省'
              ? '你们都比较平衡，既知道什么时候值得投入，也知道什么时候该收着一点。'
              : '你们都很有学生党的现实感，预算边界不会成为难开口的话题。',
      };
    case 'relationshipGoal':
      return {
        category: 'values',
        weight: 7,
        text: value === '认真稳定发展'
          ? '你们都带着认真进入关系，不太像只图一时上头的匹配。'
          : value === '先认识慢慢看'
            ? '你们都愿意先把人认识清楚，再决定要不要往前走，节奏会比较舒服。'
            : value === '轻松陪伴但别太绑'
              ? '你们都希望关系有温度但不过度捆绑，边界感会比较接近。'
              : '你们都不想一开始给关系压太重的定义，先舒服相处反而更自然。',
      };
    case 'pace':
      return {
        category: 'values',
        weight: 6,
        text: value === '慢慢来更安心'
          ? '你们都偏向慢慢来，关系推进会更稳，不容易有压迫感。'
          : value === '确认心意后可以很快'
            ? '你们都属于确认心意后会很明确的人，关系升温的节奏容易一致。'
            : '你们都不太想把关系推进得太刻意，先舒服相处反而更自然。',
      };
    case 'planning':
      return {
        category: 'values',
        weight: 4,
        text: value === '喜欢有明确计划'
          ? '你们都重视计划感，很多安排会更容易提前说清楚。'
          : value === '走一步看一步'
            ? '你们都比较随性，不会把相处变成一张任务清单。'
            : '你们都能在计划和弹性之间找到平衡，不容易因为安排方式卡住。',
      };
    case 'partnerPreference':
      return {
        category: 'values',
        weight: 5,
        text: value === '互补一点更有趣'
          ? '你们都接受互补型关系，和不同的人相处时反而更容易有新鲜感。'
          : value === '相似一点更有安全感'
            ? '你们都偏好相似感，很多日常选择会更容易得到彼此确认。'
            : '你们对关系形态都比较开放，留给真实相处的空间更大。',
      };
    case 'distance':
      return {
        category: 'values',
        weight: 4,
        text: value === '完全可以'
          ? '你们对距离都比较开放，异地或忙碌阶段不太会一开始就把机会挡掉。'
          : value === '不太想'
            ? '你们都希望关系尽量发生在现实生活半径里，见面本身会更重要。'
            : '你们对距离都保留弹性，会更愿意看真实相处的感觉。',
      };
    case 'conflictStyle':
      return {
        category: 'values',
        weight: 6,
        text: value === '最好当天说开'
          ? '你们都不喜欢把问题拖太久，出现分歧时更有机会及时收住情绪。'
          : value === '先冷静一下再聊'
            ? '你们都知道先给情绪降温，再把话说清楚，这会减少很多无效拉扯。'
            : value === '希望对方先来沟通'
              ? '你们都需要一点被接住的感觉，关系里谁先走近会是重要信号。'
              : '你们都不喜欢高冲突的相处方式，很多小摩擦会更愿意柔和处理。',
      };
    case 'reassuranceNeed':
      return {
        category: 'values',
        weight: 6,
        text: value === '经常表达会更安心'
          ? '你们都更能从明确表达里获得安全感，关系里的不确定会更少一些。'
          : value === '稳定行动比嘴上更重要'
            ? '你们都更相信持续的行动，而不是一时的甜言蜜语。'
            : value === '不需要太频繁确认'
              ? '你们都不太依赖高频确认，关系里会更轻松一点。'
              : '你们都能根据当下状态调节需要的确认感，弹性会比较大。',
      };
    case 'ambition':
      return {
        category: 'values',
        weight: 5,
        text: value === '一起冲目标会很有力量'
          ? '你们都希望关系里有并肩向前的感觉，这会带来很强的同路人气质。'
          : value === '一忙一稳互相补位也很好'
            ? '你们都能接受关系里存在节奏差，这种互补有时反而更稳。'
            : value === '工作生活平衡最重要'
              ? '你们都更在意长期可持续的节奏，不太容易把关系卷成第二份工作。'
              : '你们都偏现实，不会急着把未来描得过满，先过好眼前更重要。',
      };
    case 'familyCloseness':
      return {
        category: 'values',
        weight: 4,
        text: value === '和家人很亲近，会常聊'
          ? '你们都很重视和家人的连接，很多关于安全感和归属感的理解会比较像。'
          : value === '重要的事会沟通'
            ? '你们都在亲近和独立之间保持平衡，很多现实问题会更容易聊清楚。'
            : value === '更独立，少汇报'
              ? '你们都习惯自己消化和决定生活，边界感会更容易被尊重。'
              : '你们都愿意根据阶段调整和家人的距离，相处不会太死板。',
      };
    case 'replyStyle':
      return {
        category: 'personality',
        weight: 5,
        text: value === '看到会尽快回'
          ? '你们都偏主动回应型，关系里的存在感通常更容易被感受到。'
          : value === '忙完集中回'
            ? '你们都更习惯把注意力先放在手头事情上，再认真回消息。'
            : value === '熟了才会回得快'
              ? '你们都需要熟悉感来带动表达，关系升温后往往会越来越顺。'
              : '你们都不爱长期挂在线上，相处节奏会更偏低消耗。',
      };
    case 'chatFrequency':
      return {
        category: 'personality',
        weight: 5,
        text: value === '每天都聊一点'
          ? '你们都喜欢日常型的陪伴感，小而稳定的联系会让关系更有温度。'
          : value === '隔几天深聊一次'
            ? '你们都更看重有内容的连接，聊天不必高频也能很扎实。'
            : value === '见面比线上更重要'
              ? '你们都更相信现实里的相处，线上只是辅助而不是主场。'
              : '你们都不想被固定频率绑住，顺其自然反而更容易舒服。',
      };
    case 'directness':
      return {
        category: 'personality',
        weight: 4,
        text: value === '会很直接表达'
          ? '你们都偏直接型，很多想法不太需要靠猜。'
          : value === '会委婉一点'
            ? '你们都懂得照顾语气和分寸，表达时更容易顾及对方感受。'
            : value === '先观察再说'
              ? '你们都不会太快把话说满，很多关系判断会更稳一点。'
              : '你们都更擅长用文字整理情绪，这会让一些敏感话题更好开口。',
      };
    case 'apologyStyle':
      return {
        category: 'personality',
        weight: 4,
        text: value === '我会先主动缓和'
          ? '你们都愿意在关系里先迈一步，很多僵局不会拖太久。'
          : value === '需要一点时间整理'
            ? '你们都知道自己需要时间消化情绪，这种节奏更容易被彼此理解。'
            : value === '希望对方先给个台阶'
              ? '你们都更需要被接住的信号，这能提醒关系里要更注意安抚感。'
              : '你们都更擅长用行动而不是长篇解释去修复关系。',
      };
    case 'personalSpace':
      return {
        category: 'values',
        weight: 6,
        text: value === '很需要各自空间'
          ? '你们都很看重各自的生活空间，独处不会被误读成冷淡。'
          : value === '亲密和独处都要'
            ? '你们都想兼顾亲密和边界，这通常是比较稳的相处节奏。'
            : value === '更喜欢黏一点'
              ? '你们都更享受高陪伴感，关系里的存在感会更强。'
              : '你们都愿意根据阶段调整距离，很多边界问题会更有弹性。',
      };
    case 'publicAffection':
      return {
        category: 'personality',
        weight: 3,
        text: value === '自然公开没问题'
          ? '你们都不排斥自然表达喜欢，关系里会更有明亮感。'
          : value === '偶尔出现一下就好'
            ? '你们都接受适度公开，不会太高调也不会刻意回避。'
            : value === '线下亲密线上低调'
              ? '你们都更愿意把亲密留在现实里，线上只保留一点点痕迹。'
              : '你们都更重视关系的私密感，这种边界通常很值得被尊重。',
      };
    case 'socialMedia':
      return {
        category: 'personality',
        weight: 3,
        text: value === '愿意公开互动'
          ? '你们都愿意在公开场域里给关系一些存在感，不太怕被看见。'
          : value === '低调但不刻意隐藏'
            ? '你们都偏低调自然，不需要用公开与否来验证关系。'
            : value === '完全没必要公开'
              ? '你们都不想把关系搬上社交媒体，现实里的舒服感更重要。'
              : '你们都愿意把对方的感受放进决定里，这会让很多边界更好谈。',
      };
    case 'diet':
      return {
        category: 'date',
        weight: 4,
        text: value === '啥都吃'
          ? '你们在吃这件事上都很随和，见面时不太容易因为口味卡住。'
          : value === '偏辣党'
            ? '你们都偏爱带点刺激感的口味，一起吃饭通常不会太纠结。'
            : value === '偏清淡'
              ? '你们都偏爱清爽一点的口味，吃饭时会比较省心。'
              : value === '素食友好'
                ? '你们都对饮食边界更明确，相处时会更容易尊重彼此习惯。'
                : '你们都很容易被甜品和小惊喜打动，约会氛围会自带一点轻快感。',
      };
    case 'travelStyle':
      return {
        category: 'date',
        weight: 3,
        text: value === '提前规划路线最安心'
          ? '你们都更喜欢把出门这件事安排得明明白白，很多细节会更省心。'
          : value === '说走就走最快乐'
            ? '你们都能接受一点即兴感，临时起意反而更有约会味道。'
            : value === '有人带路就很开心'
              ? '你们都不介意把决定权放轻一点，重点会更偏向一起体验。'
              : '你们都更享受从近处慢慢熟起来，低压力的出门方式会更适合你们。',
      };
    default:
      return null;
  }
}

function buildMbtiReason(current: string, candidate: string): CompatibilityReason | null {
  if (!current || !candidate || current === '不知道' || candidate === '不知道') return null;
  if (current === candidate) {
    return {
      category: 'personality',
      weight: 8,
      text: `你们同样是 ${current}，处理信息、表达情绪和拿捏边界的方式可能会特别容易互相懂。`,
    };
  }
  const currentGroup = getMbtiGroup(current);
  const candidateGroup = getMbtiGroup(candidate);
  if (currentGroup && currentGroup === candidateGroup) {
    return {
      category: 'personality',
      weight: 7,
      text: `你们虽然不是同一型，但都属于${MBTI_GROUP_LABELS[currentGroup]}，聊天时会比较容易抓到彼此的思路。`,
    };
  }
  if (current.slice(1) === candidate.slice(1)) {
    return {
      category: 'personality',
      weight: 6,
      text: '你们的 MBTI 有一点互补感，视角不完全一样，但反而可能把话题聊得更开。',
    };
  }
  return null;
}

function buildHometownReason(current: string, candidate: string): CompatibilityReason | null {
  if (!current || !candidate) return null;
  if (current === candidate) {
    return {
      category: 'campus',
      weight: 4,
      text: `你们都来自${current}，一些成长环境里的生活感受和表达习惯可能更容易对上。`,
    };
  }
  if ((current === '重庆本地' && candidate === '西南地区') || (current === '西南地区' && candidate === '重庆本地')) {
    return {
      category: 'campus',
      weight: 3,
      text: '你们都更接近西南的生活语境，很多日常细节和聊天方式会比较容易接上。',
    };
  }
  return null;
}

function buildCampusActivityReason(shared: string[]): CompatibilityReason | null {
  if (!shared.length) return null;
  return {
    category: 'campus',
    weight: 6,
    text: `你们最近都把不少精力放在${joinReadable(shared.slice(0, 2))}上，校园生活的话题不会只停留在寒暄。`,
  };
}

function buildRelaxReason(shared: string[]): CompatibilityReason | null {
  if (!shared.length) return null;
  return {
    category: 'lifestyle',
    weight: 7,
    text: `你们都习惯用${joinReadable(shared.slice(0, 3))}来放松，聊生活方式时会比较容易接上彼此。`,
  };
}
function buildValuesReason(shared: string[]): CompatibilityReason | null {
  if (!shared.length) return null;
  return {
    category: 'values',
    weight: 9,
    text: `你们都把${joinReadable(shared.slice(0, 3))}看得很重要，对亲密关系的核心期待比较同频。`,
  };
}

function buildLoveLanguageReason(shared: string[]): CompatibilityReason | null {
  if (!shared.length) return null;
  return {
    category: 'values',
    weight: 6,
    text: `你们都更能从${joinReadable(shared.slice(0, 3))}里感受到被在意，表达喜欢的方式会比较容易对上。`,
  };
}

function buildDateStyleReason(shared: string[]): CompatibilityReason | null {
  if (!shared.length) return null;
  return {
    category: 'date',
    weight: 7,
    text: `你们都更想用${joinReadable(shared.slice(0, 2))}开启第一次见面，约会方式不太需要互相迁就。`,
  };
}

function buildDietReason(current: string, candidate: string): CompatibilityReason | null {
  if (!current || !candidate) return null;
  if (current === candidate) return buildSharedSingleReason('diet', current);
  const similarity = dietSimilarity(current, candidate);
  if ((similarity ?? 0) >= 0.65) {
    return {
      category: 'date',
      weight: 3,
      text: '你们在吃饭这件事上算是好配合，口味虽不完全一样，但不至于变成见面阻力。',
    };
  }
  return null;
}

function buildPartnerFlexReason(current: string, candidate: string): CompatibilityReason | null {
  if (!current || !candidate || current === candidate) return null;
  if (current === '都可以' || candidate === '都可以') {
    return {
      category: 'values',
      weight: 3,
      text: '至少有一方对关系形态比较开放，不会要求一开始就必须完全同款。',
    };
  }
  return null;
}

function buildDistanceFlexReason(current: string, candidate: string): CompatibilityReason | null {
  if (!current || !candidate || current === candidate) return null;
  if (current.includes('看缘分') || candidate.includes('看缘分')) {
    return {
      category: 'values',
      weight: 2,
      text: '至少有一方会更看重真实相处感受，不太会被固定标准过早劝退。',
    };
  }
  return null;
}

function buildComplementaryEnergyReason(current: string, candidate: string, currentPreference: string, candidatePreference: string): CompatibilityReason | null {
  if (!current || !candidate || current === candidate) return null;
  if (
    currentPreference === '互补一点更有趣'
    || candidatePreference === '互补一点更有趣'
    || current === '看场合切换'
    || candidate === '看场合切换'
  ) {
    return {
      category: 'personality',
      weight: 3,
      text: '你们在外向和慢热程度上不完全一样，但这种互补有机会让相处更有层次。',
    };
  }
  return null;
}

function buildFlexibleScheduleReason(current: string, candidate: string): CompatibilityReason | null {
  if (!current || !candidate || current === candidate) return null;
  if (current === '随课程和心情变化' || candidate === '随课程和心情变化') {
    return {
      category: 'rhythm',
      weight: 2,
      text: '至少有一方的作息比较有弹性，现实安排不太会把聊天和见面卡得太死。',
    };
  }
  return null;
}

function buildSharedCollegeReason(current: UserProfile, candidate: UserProfile): CompatibilityReason | null {
  if (!current.college || !candidate.college || current.college !== candidate.college) return null;
  return {
    category: 'campus',
    weight: 5,
    text: `你们都在${current.college}，校园生活半径更接近，很多日常话题会天然有共鸣。`,
  };
}

function buildSharedGradeReason(current: UserProfile, candidate: UserProfile): CompatibilityReason | null {
  if (!current.grade || !candidate.grade || current.grade !== candidate.grade) return null;
  return {
    category: 'campus',
    weight: 5,
    text: `你们同样是${current.grade}，课程、实习和阶段压力比较容易互相理解。`,
  };
}

function buildHeightPreferenceReason(current: UserProfile, candidate: UserProfile): CompatibilityReason | null {
  const candidateFitsCurrent = heightPreferenceSimilarity(getSingle(candidate, 'heightRange'), getSingle(current, 'preferredHeightRange'));
  const currentFitsCandidate = heightPreferenceSimilarity(getSingle(current, 'heightRange'), getSingle(candidate, 'preferredHeightRange'));
  const candidateFitScore = candidateFitsCurrent ?? 0;
  const currentFitScore = currentFitsCandidate ?? 0;

  if (candidateFitScore >= 1 && currentFitScore >= 1) {
    return {
      category: 'firstImpression',
      weight: 6,
      text: '你们填写的身高区间刚好都落在彼此理想范围里，第一眼期待会更容易对上。',
    };
  }

  if (candidateFitScore >= 0.7 && currentFitScore >= 0.7) {
    return {
      category: 'firstImpression',
      weight: 5,
      text: '你们的身高区间和彼此理想范围大致接近，外在偏好上不需要太多互相迁就。',
    };
  }

  if (candidateFitScore >= 0.7) {
    return {
      category: 'firstImpression',
      weight: 4,
      text: '对方的身高区间比较接近你理想中的伴侣身高，第一眼偏好上会更自然。',
    };
  }

  if (currentFitScore >= 0.7) {
    return {
      category: 'firstImpression',
      weight: 4,
      text: '你的身高区间也比较接近对方的理想范围，这类基础偏好不太容易成为阻力。',
    };
  }

  return null;
}

function buildFallbackReasons(current: UserProfile, candidate: UserProfile): CompatibilityReason[] {
  const reasons: CompatibilityReason[] = [];
  const currentGoal = getSingle(current, 'relationshipGoal');
  const candidateGoal = getSingle(candidate, 'relationshipGoal');
  const currentDateStyle = getMulti(current, 'dateStyle');
  const candidateDateStyle = getMulti(candidate, 'dateStyle');
  const currentChatFrequency = getSingle(current, 'chatFrequency');
  const candidateChatFrequency = getSingle(candidate, 'chatFrequency');

  if (currentGoal === '先认识慢慢看' || candidateGoal === '先认识慢慢看') {
    reasons.push({
      category: 'values',
      weight: 2,
      text: '至少有一方更愿意先把人认识清楚，这会让关系一开始少一点推着走的压力。',
    });
  }
  if (currentDateStyle.includes('咖啡聊天') || candidateDateStyle.includes('咖啡聊天') || currentDateStyle.includes('校园散步') || candidateDateStyle.includes('校园散步')) {
    reasons.push({
      category: 'date',
      weight: 2,
      text: '至少有一方偏好低压力的见面方式，这让初次聊天更容易有安全感。',
    });
  }
  if (currentChatFrequency === '见面比线上更重要' || candidateChatFrequency === '见面比线上更重要') {
    reasons.push({
      category: 'personality',
      weight: 2,
      text: '至少有一方更相信现实里的相处，这会让关系不容易被线上节奏绑架。',
    });
  }
  reasons.push({
    category: 'campus',
    weight: 1,
    text: '同在西大这个生活范围里，认识和见面的现实成本会比陌生社交平台低很多。',
  });

  return reasons;
}

function dedupeReasons(reasons: CompatibilityReason[]): CompatibilityReason[] {
  const seen = new Set<string>();
  return reasons.filter((reason) => {
    if (!reason.text || seen.has(reason.text)) return false;
    seen.add(reason.text);
    return true;
  });
}

function buildHeadline(categories: CompatibilityCategory[]): string {
  if (categories.length >= 2) return `你们在${CATEGORY_LABELS[categories[0]]}和${CATEGORY_LABELS[categories[1]]}上会比较容易对频。`;
  if (categories.length === 1) return `你们在${CATEGORY_LABELS[categories[0]]}上已经有比较明显的契合。`;
  return '你们不是表面标签上的同款，但相处方式里有不少能接住彼此的点。';
}

function buildSummary(categories: CompatibilityCategory[]): string {
  if (categories.includes('values') && categories.includes('rhythm')) {
    return '一边有相近的关系期待，一边也有接得住彼此的日常节奏，这类匹配通常更容易越聊越顺。';
  }
  if (categories.includes('personality') && categories.includes('date')) {
    return '不只是性格标签接近，连打开话题和见面的方式都比较容易自然发生。';
  }
  if (categories.includes('campus')) {
    return '生活半径接近会让认识这件事轻松很多，很多现实顾虑不会太早出现。';
  }
  return '这些契合点不是替你下结论，而是给你一个更自然的聊天起点。';
}

export function buildCompatibilityInsight(current: UserProfile, candidate: UserProfile): CompatibilityInsight {
  const reasons: CompatibilityReason[] = [];
  const currentMbti = getSingle(current, 'mbti');
  const candidateMbti = getSingle(candidate, 'mbti');
  const currentHometown = getSingle(current, 'hometownRegion');
  const candidateHometown = getSingle(candidate, 'hometownRegion');
  const currentCampusActivity = getMulti(current, 'campusActivity');
  const candidateCampusActivity = getMulti(candidate, 'campusActivity');
  const currentRelax = getMulti(current, 'relax');
  const candidateRelax = getMulti(candidate, 'relax');
  const currentValues = getMulti(current, 'values');
  const candidateValues = getMulti(candidate, 'values');
  const currentLoveLanguage = getMulti(current, 'loveLanguage');
  const candidateLoveLanguage = getMulti(candidate, 'loveLanguage');
  const currentDateStyle = getMulti(current, 'dateStyle');
  const candidateDateStyle = getMulti(candidate, 'dateStyle');
  const currentPartnerPreference = getSingle(current, 'partnerPreference');
  const candidatePartnerPreference = getSingle(candidate, 'partnerPreference');
  const currentEnergy = getSingle(current, 'energy');
  const candidateEnergy = getSingle(candidate, 'energy');
  const currentSchedule = getSingle(current, 'schedule');
  const candidateSchedule = getSingle(candidate, 'schedule');
  const currentDistance = getSingle(current, 'distance');
  const candidateDistance = getSingle(candidate, 'distance');
  const currentDiet = getSingle(current, 'diet');
  const candidateDiet = getSingle(candidate, 'diet');
  const sharedCampusActivity = intersection(currentCampusActivity, candidateCampusActivity);
  const sharedRelax = intersection(currentRelax, candidateRelax);
  const sharedValues = intersection(currentValues, candidateValues);
  const sharedLoveLanguage = intersection(currentLoveLanguage, candidateLoveLanguage);
  const sharedDateStyle = intersection(currentDateStyle, candidateDateStyle);

  const singleKeys = [
    'campusMode', 'circleStyle', 'weekend', 'schedule', 'energy', 'exercise', 'pets', 'socialFrequency', 'smoking', 'drinking',
    'spendingStyle', 'relationshipGoal', 'pace', 'planning', 'partnerPreference', 'distance', 'conflictStyle', 'reassuranceNeed',
    'ambition', 'familyCloseness', 'replyStyle', 'chatFrequency', 'directness', 'apologyStyle', 'personalSpace', 'publicAffection',
    'socialMedia', 'travelStyle',
  ] as const;

  reasons.push(...[
    buildSharedCollegeReason(current, candidate),
    buildSharedGradeReason(current, candidate),
    buildHeightPreferenceReason(current, candidate),
    buildHometownReason(currentHometown, candidateHometown),
    buildMbtiReason(currentMbti, candidateMbti),
    buildCampusActivityReason(sharedCampusActivity),
    buildRelaxReason(sharedRelax),
    buildValuesReason(sharedValues),
    buildLoveLanguageReason(sharedLoveLanguage),
    buildDateStyleReason(sharedDateStyle),
    buildDietReason(currentDiet, candidateDiet),
    buildPartnerFlexReason(currentPartnerPreference, candidatePartnerPreference),
    buildDistanceFlexReason(currentDistance, candidateDistance),
    buildComplementaryEnergyReason(currentEnergy, candidateEnergy, currentPartnerPreference, candidatePartnerPreference),
    buildFlexibleScheduleReason(currentSchedule, candidateSchedule),
  ].filter(Boolean) as CompatibilityReason[]);

  singleKeys.forEach((key) => {
    const currentValue = getSingle(current, key);
    const candidateValue = getSingle(candidate, key);
    if (currentValue && currentValue === candidateValue) {
      const reason = buildSharedSingleReason(key, currentValue);
      if (reason) reasons.push(reason);
    }
  });

  let rankedReasons = dedupeReasons(reasons).sort((left, right) => right.weight - left.weight || left.text.localeCompare(right.text, 'zh-CN'));
  if (rankedReasons.length < 3) {
    rankedReasons = dedupeReasons([...rankedReasons, ...buildFallbackReasons(current, candidate)])
      .sort((left, right) => right.weight - left.weight || left.text.localeCompare(right.text, 'zh-CN'));
  }

  const topReasons = rankedReasons.slice(0, 4);
  const categories = [...new Set(topReasons.map((reason) => reason.category))].slice(0, 2);

  return {
    headline: buildHeadline(categories),
    summary: buildSummary(categories),
    reasons: topReasons.map((reason) => reason.text),
  };
}

export function buildProfileTags(profile: UserProfile): string[] {
  const tags = [
    getSingle(profile, 'energy'),
    getSingle(profile, 'schedule'),
    getSingle(profile, 'mbti'),
    getSingle(profile, 'socialFrequency'),
    ...getMulti(profile, 'relax').slice(0, 1),
    ...getMulti(profile, 'dateStyle').slice(0, 1),
  ].filter(Boolean);

  return [...new Set(tags)].slice(0, 5);
}

export function rankCandidates(current: UserProfile, candidates: UserProfile[], context: MatchContext = {}): RecommendationCandidate[] {
  const interactedUserIds = context.interactedUserIds ?? new Set<string>();
  const blockedUserIds = context.blockedUserIds ?? new Set<string>();

  return candidates
    .filter((candidate) => candidate.id !== current.id)
    .filter((candidate) => !candidate.isBanned)
    .filter((candidate) => !interactedUserIds.has(candidate.id))
    .filter((candidate) => !blockedUserIds.has(candidate.id))
    .filter((candidate) => canUsersMatchByGender(current.gender, candidate.gender))
    .map((candidate) => {
      const accumulator: ScoreAccumulator = { score: 0, total: 0 };

      addMetric(accumulator, 5, exactSimilarity(current.college, candidate.college));
      addMetric(accumulator, 5, exactSimilarity(current.grade, candidate.grade));
      addMetric(accumulator, 5, heightPreferenceSimilarity(getSingle(candidate, 'heightRange'), getSingle(current, 'preferredHeightRange')));
      addMetric(accumulator, 5, heightPreferenceSimilarity(getSingle(current, 'heightRange'), getSingle(candidate, 'preferredHeightRange')));
      addMetric(accumulator, 3, hometownSimilarity(getSingle(current, 'hometownRegion'), getSingle(candidate, 'hometownRegion')));
      addMetric(accumulator, 4, softSimilarity(getSingle(current, 'campusMode'), getSingle(candidate, 'campusMode'), { neutral: ['多线程平衡型'], neutralValue: 0.7, mismatch: 0.3 }));
      addMetric(accumulator, 6, jaccardScore(getMulti(current, 'campusActivity'), getMulti(candidate, 'campusActivity')));
      addMetric(accumulator, 4, softSimilarity(getSingle(current, 'circleStyle'), getSingle(candidate, 'circleStyle'), { neutral: ['看缘分自然认识'], neutralValue: 0.65, closePairs: [['多个圈子切换', '认识的人不少但很挑熟'], ['固定小圈子最舒服', '看缘分自然认识']], closeValue: 0.6, mismatch: 0.3 }));
      addMetric(accumulator, 7, mbtiSimilarity(getSingle(current, 'mbti'), getSingle(candidate, 'mbti')));
      addMetric(accumulator, 5, softSimilarity(getSingle(current, 'weekend'), getSingle(candidate, 'weekend'), { neutral: ['看心情随机切换'], neutralValue: 0.65, mismatch: 0.2 }));
      addMetric(accumulator, 5, softSimilarity(getSingle(current, 'schedule'), getSingle(candidate, 'schedule'), { neutral: ['随课程和心情变化'], neutralValue: 0.65, mismatch: 0.2 }));
      addMetric(accumulator, 6, softSimilarity(getSingle(current, 'energy'), getSingle(candidate, 'energy'), { neutral: ['看场合切换'], neutralValue: 0.6, mismatch: 0.25 }));
      addMetric(accumulator, 3, softSimilarity(getSingle(current, 'exercise'), getSingle(candidate, 'exercise'), { neutral: ['偶尔动一动'], neutralValue: 0.6, mismatch: 0.2 }));
      addMetric(accumulator, 7, jaccardScore(getMulti(current, 'relax'), getMulti(candidate, 'relax')));
      addMetric(accumulator, 3, softSimilarity(getSingle(current, 'pets'), getSingle(candidate, 'pets'), { neutral: ['无感'], neutralValue: 0.6, mismatch: 0.2 }));
      addMetric(accumulator, 4, softSimilarity(getSingle(current, 'socialFrequency'), getSingle(candidate, 'socialFrequency'), { closePairs: [['几乎每天都想和人连接', '有活动就愿意出现'], ['有活动就愿意出现', '小范围稳定联系就够了'], ['小范围稳定联系就够了', '更需要大量独处']], closeValue: 0.62, mismatch: 0.2 }));
      addMetric(accumulator, 7, mappedSimilarity(getSingle(current, 'smoking'), getSingle(candidate, 'smoking'), SMOKING_PAIR_SCORES, 0.25));
      addMetric(accumulator, 4, mappedSimilarity(getSingle(current, 'drinking'), getSingle(candidate, 'drinking'), DRINKING_PAIR_SCORES, 0.3));
      addMetric(accumulator, 4, mappedSimilarity(getSingle(current, 'spendingStyle'), getSingle(candidate, 'spendingStyle'), SPENDING_PAIR_SCORES, 0.3));
      addMetric(accumulator, 9, jaccardScore(getMulti(current, 'values'), getMulti(candidate, 'values')));
      addMetric(accumulator, 8, mappedSimilarity(getSingle(current, 'relationshipGoal'), getSingle(candidate, 'relationshipGoal'), RELATIONSHIP_GOAL_PAIR_SCORES, 0.3));
      addMetric(accumulator, 6, exactSimilarity(getSingle(current, 'pace'), getSingle(candidate, 'pace')));
      addMetric(accumulator, 5, distanceSimilarity(getSingle(current, 'distance'), getSingle(candidate, 'distance')));
      addMetric(accumulator, 4, softSimilarity(getSingle(current, 'planning'), getSingle(candidate, 'planning'), { neutral: ['会规划但保留弹性'], neutralValue: 0.7, mismatch: 0.25 }));
      addMetric(accumulator, 5, partnerPreferenceSimilarity(getSingle(current, 'partnerPreference'), getSingle(candidate, 'partnerPreference')));
      addMetric(accumulator, 6, mappedSimilarity(getSingle(current, 'conflictStyle'), getSingle(candidate, 'conflictStyle'), CONFLICT_PAIR_SCORES, 0.25));
      addMetric(accumulator, 6, mappedSimilarity(getSingle(current, 'reassuranceNeed'), getSingle(candidate, 'reassuranceNeed'), REASSURANCE_PAIR_SCORES, 0.3));
      addMetric(accumulator, 5, mappedSimilarity(getSingle(current, 'ambition'), getSingle(candidate, 'ambition'), AMBITION_PAIR_SCORES, 0.35));
      addMetric(accumulator, 4, mappedSimilarity(getSingle(current, 'familyCloseness'), getSingle(candidate, 'familyCloseness'), FAMILY_PAIR_SCORES, 0.35));
      addMetric(accumulator, 5, mappedSimilarity(getSingle(current, 'replyStyle'), getSingle(candidate, 'replyStyle'), REPLY_PAIR_SCORES, 0.25));
      addMetric(accumulator, 5, mappedSimilarity(getSingle(current, 'chatFrequency'), getSingle(candidate, 'chatFrequency'), CHAT_FREQUENCY_PAIR_SCORES, 0.25));
      addMetric(accumulator, 4, mappedSimilarity(getSingle(current, 'directness'), getSingle(candidate, 'directness'), DIRECTNESS_PAIR_SCORES, 0.25));
      addMetric(accumulator, 3, exactSimilarity(getSingle(current, 'apologyStyle'), getSingle(candidate, 'apologyStyle')));
      addMetric(accumulator, 6, jaccardScore(getMulti(current, 'loveLanguage'), getMulti(candidate, 'loveLanguage')));
      addMetric(accumulator, 6, mappedSimilarity(getSingle(current, 'personalSpace'), getSingle(candidate, 'personalSpace'), PERSONAL_SPACE_PAIR_SCORES, 0.25));
      addMetric(accumulator, 3, mappedSimilarity(getSingle(current, 'publicAffection'), getSingle(candidate, 'publicAffection'), PUBLIC_AFFECTION_PAIR_SCORES, 0.3));
      addMetric(accumulator, 3, mappedSimilarity(getSingle(current, 'socialMedia'), getSingle(candidate, 'socialMedia'), SOCIAL_MEDIA_PAIR_SCORES, 0.3));
      addMetric(accumulator, 6, jaccardScore(getMulti(current, 'dateStyle'), getMulti(candidate, 'dateStyle')));
      addMetric(accumulator, 4, dietSimilarity(getSingle(current, 'diet'), getSingle(candidate, 'diet')));
      addMetric(accumulator, 3, mappedSimilarity(getSingle(current, 'travelStyle'), getSingle(candidate, 'travelStyle'), TRAVEL_STYLE_PAIR_SCORES, 0.3));

      let score = accumulator.total > 0 ? Math.round((accumulator.score / accumulator.total) * 100) : 0;
      score += stableJitter(`${current.id}:${candidate.id}`);
      score = Math.max(0, Math.min(100, score));

      return {
        ...candidate,
        score,
        tags: buildProfileTags(candidate),
      } satisfies RecommendationCandidate;
    })
    .sort((left, right) => right.score - left.score || left.nickname.localeCompare(right.nickname, 'zh-CN'));
}
