import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return Object.fromEntries(
    fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const divider = line.indexOf('=');
        const key = line.slice(0, divider).trim();
        const value = line.slice(divider + 1).trim().replace(/^['"]|['"]$/g, '');
        return [key, value];
      }),
  );
}

const fileEnv = loadEnvFile(path.join(projectRoot, '.env'));
const env = { ...fileEnv, ...process.env };

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
const emailDomain = env.VITE_STUDENT_EMAIL_DOMAIN || 'swudate.local';
const defaultPassword = env.SEED_TEST_USER_PASSWORD || 'Test1234!';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY，无法生成测试用户。');
}

function createAnonClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function toEmail(studentId) {
  return `${studentId}@${emailDomain}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const TEST_USERS = [
  {
    studentId: '20260001',
    password: defaultPassword,
    nickname: '林知夏',
    gender: 'female',
    grade: '大二',
    college: '经济管理学院',
    bio: '喜欢在晚风里散步，也喜欢把普通日子过得很认真。',
    answers: {
      grade: '大二',
      college: '经济管理学院',
      heightRange: '160-169cm',
      preferredHeightRange: '170-179cm',
      mbti: 'INFJ',
      weekend: '出门探索',
      schedule: '早睡早起',
      energy: 'I 人慢热型',
      exercise: '偶尔动一动',
      relax: ['读书', '音乐', '逛街'],
      pets: '超爱',
      values: ['三观一致', '陪伴感', '安全感'],
      pace: '慢慢来更安心',
      distance: '看缘分和具体情况',
      planning: '会规划但保留弹性',
      partnerPreference: '相似一点更有安全感',
      dateStyle: ['咖啡聊天', '户外散步'],
      diet: '偏清淡',
      emoji: '🌷',
      message: '希望我们能从一句今天过得怎么样开始。',
    },
  },
  {
    studentId: '20260002',
    password: defaultPassword,
    nickname: '周屿',
    gender: 'male',
    grade: '大三',
    college: '经济管理学院',
    bio: '看起来安静，其实熟起来以后会把很多细节都记得很清楚。',
    answers: {
      grade: '大三',
      college: '经济管理学院',
      heightRange: '170-179cm',
      preferredHeightRange: '160-169cm',
      mbti: 'ENFJ',
      weekend: '出门探索',
      schedule: '早睡早起',
      energy: '看场合切换',
      exercise: '经常运动',
      relax: ['音乐', '运动', '读书'],
      pets: '超爱',
      values: ['三观一致', '安全感', '上进心'],
      pace: '慢慢来更安心',
      distance: '看缘分和具体情况',
      planning: '会规划但保留弹性',
      partnerPreference: '相似一点更有安全感',
      dateStyle: ['咖啡聊天', '户外散步'],
      diet: '啥都吃',
      emoji: '☕',
      message: '想认识一个能一起散步，也能一起认真生活的人。',
    },
  },
  {
    studentId: '20260003',
    password: defaultPassword,
    nickname: '许安歌',
    gender: 'female',
    grade: '研一',
    college: '新闻传媒学院',
    bio: '会因为一句好文案开心很久，也会在夜里反复听同一首歌。',
    answers: {
      grade: '研一',
      college: '新闻传媒学院',
      heightRange: '160-169cm',
      preferredHeightRange: '170-179cm',
      mbti: 'INFP',
      weekend: '宅家充电',
      schedule: '夜猫子',
      energy: 'I 人慢热型',
      exercise: '偶尔动一动',
      relax: ['刷剧', '音乐', '摄影'],
      pets: '无感',
      values: ['陪伴感', '浪漫', '三观一致'],
      pace: '顺其自然就好',
      distance: '完全可以',
      planning: '会规划但保留弹性',
      partnerPreference: '互补一点更有趣',
      dateStyle: ['看展看电影', '咖啡聊天'],
      diet: '偏辣党',
      emoji: '🎧',
      message: '如果你也喜欢细碎却真诚的分享，我们可以慢慢聊。',
    },
  },
  {
    studentId: '20260004',
    password: defaultPassword,
    nickname: '陈泊言',
    gender: 'male',
    grade: '大四',
    college: '计算机与信息科学学院 软件学院',
    bio: '白天写代码，晚上去操场绕几圈，脑子会清醒很多。',
    answers: {
      grade: '大四',
      college: '计算机与信息科学学院 软件学院',
      heightRange: '170-179cm',
      preferredHeightRange: '160-169cm',
      mbti: 'INTJ',
      weekend: '宅家充电',
      schedule: '夜猫子',
      energy: '看场合切换',
      exercise: '经常运动',
      relax: ['游戏', '运动', '音乐'],
      pets: '无感',
      values: ['上进心', '三观一致', '独立性'],
      pace: '顺其自然就好',
      distance: '完全可以',
      planning: '喜欢有明确计划',
      partnerPreference: '互补一点更有趣',
      dateStyle: ['看展看电影', '户外散步'],
      diet: '偏辣党',
      emoji: '🛰️',
      message: '想认识一个愿意认真聊天，也愿意给彼此空间的人。',
    },
  },
  {
    studentId: '20260005',
    password: defaultPassword,
    nickname: '沈晚晴',
    gender: 'female',
    grade: '大一',
    college: '外国语学院',
    bio: '会把喜欢的电影台词记在备忘录，也很爱热闹的街边小店。',
    answers: {
      grade: '大一',
      college: '外国语学院',
      heightRange: '160-169cm',
      preferredHeightRange: '170-179cm',
      mbti: 'ENFP',
      weekend: '看心情随机切换',
      schedule: '夜猫子',
      energy: 'E 人外放型',
      exercise: '偶尔动一动',
      relax: ['刷剧', '逛街', '音乐'],
      pets: '超爱',
      values: ['幽默感', '浪漫', '陪伴感'],
      pace: '确认心意后可以很快',
      distance: '不太想',
      planning: '走一步看一步',
      partnerPreference: '互补一点更有趣',
      dateStyle: ['逛街吃好吃的', '看展看电影'],
      diet: '啥都吃',
      emoji: '🌙',
      message: '如果你也喜欢临时起意的小快乐，我们应该会聊得来。',
    },
  },
  {
    studentId: '20260006',
    password: defaultPassword,
    nickname: '顾星河',
    gender: 'male',
    grade: '大二',
    college: '人工智能学院',
    bio: '有点理工脑，但也会被可爱的细节打动。',
    answers: {
      grade: '大二',
      college: '人工智能学院',
      heightRange: '170-179cm',
      preferredHeightRange: '160-169cm',
      mbti: 'ENTP',
      weekend: '看心情随机切换',
      schedule: '夜猫子',
      energy: 'E 人外放型',
      exercise: '偶尔动一动',
      relax: ['游戏', '音乐', '逛街'],
      pets: '超爱',
      values: ['幽默感', '上进心', '陪伴感'],
      pace: '确认心意后可以很快',
      distance: '不太想',
      planning: '走一步看一步',
      partnerPreference: '互补一点更有趣',
      dateStyle: ['逛街吃好吃的', '咖啡聊天'],
      diet: '啥都吃',
      emoji: '🚲',
      message: '聊得开心的话，一起去校门口吃夜宵也不错。',
    },
  },
  {
    studentId: '20260007',
    password: defaultPassword,
    nickname: '苏沐白',
    gender: 'male',
    grade: '研二',
    college: '物理科学与技术学院',
    bio: '习惯把节奏放慢一点，认真感受每一个普通的日常。',
    answers: {
      grade: '研二',
      college: '物理科学与技术学院',
      heightRange: '170-179cm',
      preferredHeightRange: '160-169cm',
      mbti: 'ISTJ',
      weekend: '宅家充电',
      schedule: '早睡早起',
      energy: 'I 人慢热型',
      exercise: '经常运动',
      relax: ['读书', '运动', '做饭'],
      pets: '有点怕',
      values: ['三观一致', '独立性', '安全感'],
      pace: '慢慢来更安心',
      distance: '完全可以',
      planning: '喜欢有明确计划',
      partnerPreference: '相似一点更有安全感',
      dateStyle: ['户外散步', '咖啡聊天'],
      diet: '偏清淡',
      emoji: '📚',
      message: '如果你也觉得安静不是冷淡，那我们可以慢慢认识。',
    },
  },
  {
    studentId: '20260008',
    password: defaultPassword,
    nickname: '乔听雨',
    gender: 'female',
    grade: '大三',
    college: '心理学部',
    bio: '很喜欢认真观察人，也喜欢把温柔落到具体的小事里。',
    answers: {
      grade: '大三',
      college: '心理学部',
      heightRange: '160-169cm',
      preferredHeightRange: '170-179cm',
      mbti: 'ISFP',
      weekend: '宅家充电',
      schedule: '随课程和心情变化',
      energy: 'I 人慢热型',
      exercise: '偶尔动一动',
      relax: ['读书', '音乐', '摄影'],
      pets: '超爱',
      values: ['安全感', '陪伴感', '三观一致'],
      pace: '慢慢来更安心',
      distance: '看缘分和具体情况',
      planning: '会规划但保留弹性',
      partnerPreference: '相似一点更有安全感',
      dateStyle: ['咖啡聊天', '看展看电影'],
      diet: '偏清淡',
      emoji: '🫧',
      message: '希望你也愿意在忙碌里，给真诚留一点位置。',
    },
  },
];


const MATCH_PLANS = [
  {
    members: ['20260001', '20260002'],
    score: 91,
    messages: [
      { from: '20260001', content: '嗨，你也会早起去吃早餐吗？' },
      { from: '20260002', content: '会，我最近常去北区那边，你呢？' },
      { from: '20260001', content: '我也差不多，感觉周末散步顺便吃早餐很舒服。' },
      { from: '20260002', content: '那我们改天可以试试一起走走。' },
    ],
  },
  {
    members: ['20260001', '20260008'],
    score: 84,
    messages: [
      { from: '20260008', content: '你的那句“今天过得怎么样”让我很有好感。' },
      { from: '20260001', content: '那我先认真问一句，今天过得怎么样？' },
      { from: '20260008', content: '还不错，刚从图书馆出来，有点累但心情很好。' },
    ],
  },
  {
    members: ['20260003', '20260004'],
    score: 88,
    messages: [
      { from: '20260003', content: '你会一个人去操场走路这点，莫名很加分。' },
      { from: '20260004', content: '谢谢，你喜欢什么样的放松方式？' },
      { from: '20260003', content: '听歌和看电影，偶尔也会突然想拍照。' },
      { from: '20260004', content: '那感觉我们可以先从看一部电影开始。' },
    ],
  },
  {
    members: ['20260005', '20260006'],
    score: 82,
    messages: [
      { from: '20260005', content: '你也喜欢逛街吃东西的话，那我们应该不难聊。' },
      { from: '20260006', content: '我已经开始想校门口那几家夜宵店了。' },
      { from: '20260005', content: '哈哈，那你先选一家，下次见面直接去。' },
    ],
  },
];

async function waitForPublicUserRow(client, userId) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { data, error } = await client.from('users').select('id').eq('id', userId).maybeSingle();
    if (!error && data?.id) return;
    await sleep(250);
  }

  throw new Error(`用户 ${userId} 的 public.users 资料行没有及时创建。`);
}

async function signInExistingUser(client, studentId, password) {
  const { data, error } = await client.auth.signInWithPassword({ email: toEmail(studentId), password });
  if (error) {
    if (error.message.toLowerCase().includes('email not confirmed')) {
      throw new Error(`测试用户 ${studentId} 已创建，但当前项目仍要求邮箱确认。请先关闭 Confirm email 后重试。`);
    }
    throw error;
  }
  if (!data.user) {
    throw new Error(`测试用户 ${studentId} 登录成功，但没有返回用户信息。`);
  }
  return data.user;
}

async function ensureSeedUser(seed) {
  const client = createAnonClient();
  const signup = await client.auth.signUp({
    email: toEmail(seed.studentId),
    password: seed.password,
    options: {
      data: {
        student_id: seed.studentId,
      },
    },
  });

  let user = signup.data.user;

  if (signup.error) {
    const message = signup.error.message.toLowerCase();
    const isDuplicate = message.includes('already') || message.includes('registered') || message.includes('exists');
    if (!isDuplicate) {
      throw signup.error;
    }
    user = await signInExistingUser(client, seed.studentId, seed.password);
  } else if (!signup.data.session) {
    user = await signInExistingUser(client, seed.studentId, seed.password);
  }

  if (!user) {
    throw new Error(`无法创建或登录测试用户 ${seed.studentId}。`);
  }

  await waitForPublicUserRow(client, user.id);

  const { error: profileError } = await client
    .from('users')
    .update({
      student_id: seed.studentId,
      nickname: seed.nickname,
      gender: seed.gender,
      grade: seed.grade,
      college: seed.college,
      bio: seed.bio,
      is_verified: false,
      last_active_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (profileError) {
    throw profileError;
  }

  const answers = Object.entries(seed.answers).map(([questionId, value]) => ({
    user_id: user.id,
    question_id: questionId,
    answer: value,
  }));

  const { error: answerError } = await client.from('profile_answers').upsert(answers, { onConflict: 'user_id,question_id' });
  if (answerError) {
    throw answerError;
  }

  return {
    ...seed,
    client,
    userId: user.id,
  };
}

async function ensureLike(context, targetId) {
  const { error } = await context.client.from('interactions').upsert(
    {
      user_id: context.userId,
      target_id: targetId,
      action: 'like',
    },
    { onConflict: 'user_id,target_id' },
  );

  if (error) throw error;
}

async function ensureMatch(plan, contexts) {
  const left = contexts.get(plan.members[0]);
  const right = contexts.get(plan.members[1]);

  if (!left || !right) {
    throw new Error(`匹配计划 ${plan.members.join(' & ')} 缺少用户上下文。`);
  }

  await ensureLike(left, right.userId);
  await ensureLike(right, left.userId);

  const [userA, userB] = [left.userId, right.userId].sort();
  const creator = userA === left.userId ? left : right;
  const matchedAt = new Date().toISOString();

  const { data, error } = await creator.client
    .from('matches')
    .upsert(
      {
        user_a: userA,
        user_b: userB,
        score: plan.score,
        status: 'matched',
        matched_at: matchedAt,
      },
      { onConflict: 'user_a,user_b' },
    )
    .select('id')
    .single();

  if (error || !data?.id) {
    throw error ?? new Error(`无法创建匹配 ${plan.members.join(' & ')}。`);
  }

  const { data: existingMessages, error: existingError } = await creator.client
    .from('messages')
    .select('id')
    .eq('match_id', data.id)
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  if ((existingMessages ?? []).length > 0) {
    return data.id;
  }

  const baseTime = Date.now() - plan.messages.length * 12 * 60 * 1000;
  for (const [index, message] of plan.messages.entries()) {
    const sender = contexts.get(message.from);
    if (!sender) continue;

    const { error: messageError } = await sender.client.from('messages').insert({
      match_id: data.id,
      sender_id: sender.userId,
      content: message.content,
      created_at: new Date(baseTime + index * 6 * 60 * 1000).toISOString(),
      is_read: index !== plan.messages.length - 1,
    });

    if (messageError) {
      throw messageError;
    }
  }

  return data.id;
}

async function main() {
  console.log('开始生成 SWU Date 测试用户...');

  const contexts = new Map();
  for (const seed of TEST_USERS) {
    const context = await ensureSeedUser(seed);
    contexts.set(seed.studentId, context);
    console.log(`已准备用户 ${seed.studentId} / ${seed.nickname}`);
  }

  for (const plan of MATCH_PLANS) {
    const matchId = await ensureMatch(plan, contexts);
    console.log(`已准备匹配 ${plan.members.join(' <-> ')} / ${matchId}`);
  }

  console.log('\n测试账号已准备完成：');
  console.table(
    TEST_USERS.map((user) => ({
      studentId: user.studentId,
      nickname: user.nickname,
      password: user.password,
      email: toEmail(user.studentId),
    })),
  );

  console.log('\n推荐优先登录这几个账号：');
  console.log('- 20260001 / Test1234! ：有 2 个匹配和历史聊天，可测消息列表、聊天、推荐页');
  console.log('- 20260003 / Test1234! ：有 1 个匹配和历史聊天');
  console.log('- 20260007 / Test1234! ：暂无匹配，可测推荐流');
}

main().catch((error) => {
  console.error('\n生成测试用户失败：');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
