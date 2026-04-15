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

function createAnonClient(supabaseUrl, supabaseAnonKey) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function toEmail(studentId, domain) {
  return `${studentId}@${domain}`;
}

function extractQuestionSection(source) {
  const start = source.indexOf('export const QUESTIONS: Question[] = [');
  const end = source.indexOf('export const REQUIRED_QUESTION_IDS');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Unable to locate QUESTIONS export in src/data/questions.ts');
  }
  return source.slice(start, end);
}

const QUESTION_IDS_WITH_OPTIONS = [
  'mbti',
  'hometownRegion',
  'heightRange',
  'preferredHeightRange',
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
  'apologyStyle',
  'loveLanguage',
  'personalSpace',
  'publicAffection',
  'socialMedia',
  'dateStyle',
  'diet',
  'travelStyle',
];

function extractOptionsById(questionSource) {
  const optionsById = new Map();

  for (const questionId of QUESTION_IDS_WITH_OPTIONS) {
    const pattern = new RegExp(String.raw`id:\s*'${questionId}'[\s\S]*?options:\s*toOptions\(\[([\s\S]*?)\]\)`);
    const match = questionSource.match(pattern);
    if (!match) {
      throw new Error(`Missing options block for ${questionId}`);
    }

    const values = [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]);
    optionsById.set(questionId, values);
  }

  return optionsById;
}

function resolveOptionValue(optionsById, questionId, spec) {
  if (Array.isArray(spec)) {
    return spec.map((index) => resolveOptionValue(optionsById, questionId, index));
  }

  const options = optionsById.get(questionId);
  if (!options) {
    throw new Error(`Missing option list for question ${questionId}`);
  }

  const value = options[spec];
  if (typeof value !== 'string') {
    throw new Error(`Invalid option index ${spec} for question ${questionId}`);
  }

  return value;
}

const PROFILE_PLANS = {
  '20260001': {
    mbti: 4,
    hometownRegion: 0,
    heightRange: 1,
    preferredHeightRange: 2,
    campusMode: 0,
    campusActivity: [0, 5],
    circleStyle: 0,
    weekend: 1,
    schedule: 0,
    energy: 0,
    exercise: 1,
    relax: [2, 3, 8],
    pets: 0,
    socialFrequency: 2,
    smoking: 3,
    drinking: 2,
    spendingStyle: 1,
    values: [0, 4, 5],
    relationshipGoal: 0,
    pace: 0,
    distance: 2,
    planning: 2,
    partnerPreference: 1,
    conflictStyle: 1,
    reassuranceNeed: 1,
    ambition: 2,
    familyCloseness: 1,
    replyStyle: 1,
    chatFrequency: 1,
    directness: 1,
    apologyStyle: 1,
    loveLanguage: [0, 1, 4],
    personalSpace: 1,
    publicAffection: 2,
    socialMedia: 1,
    dateStyle: [0, 1],
    diet: 2,
    travelStyle: 3,
  },
  '20260002': {
    mbti: 6,
    hometownRegion: 2,
    heightRange: 2,
    preferredHeightRange: 1,
    campusMode: 3,
    campusActivity: [0, 3],
    circleStyle: 2,
    weekend: 0,
    schedule: 2,
    energy: 2,
    exercise: 1,
    relax: [2, 3, 8],
    pets: 0,
    socialFrequency: 2,
    smoking: 2,
    drinking: 1,
    spendingStyle: 2,
    values: [0, 5, 9],
    relationshipGoal: 1,
    pace: 0,
    distance: 2,
    planning: 2,
    partnerPreference: 1,
    conflictStyle: 1,
    reassuranceNeed: 1,
    ambition: 2,
    familyCloseness: 1,
    replyStyle: 1,
    chatFrequency: 1,
    directness: 1,
    apologyStyle: 3,
    loveLanguage: [0, 4, 1],
    personalSpace: 1,
    publicAffection: 2,
    socialMedia: 3,
    dateStyle: [0, 2],
    diet: 2,
    travelStyle: 3,
  },
  '20260003': {
    mbti: 5,
    hometownRegion: 2,
    heightRange: 1,
    preferredHeightRange: 2,
    campusMode: 0,
    campusActivity: [0, 5],
    circleStyle: 0,
    weekend: 0,
    schedule: 1,
    energy: 0,
    exercise: 1,
    relax: [0, 3, 6],
    pets: 1,
    socialFrequency: 3,
    smoking: 3,
    drinking: 2,
    spendingStyle: 1,
    values: [0, 5, 6],
    relationshipGoal: 1,
    pace: 2,
    distance: 0,
    planning: 2,
    partnerPreference: 1,
    conflictStyle: 1,
    reassuranceNeed: 3,
    ambition: 3,
    familyCloseness: 3,
    replyStyle: 1,
    chatFrequency: 1,
    directness: 3,
    apologyStyle: 1,
    loveLanguage: [0, 1, 5],
    personalSpace: 0,
    publicAffection: 3,
    socialMedia: 2,
    dateStyle: [0, 2],
    diet: 1,
    travelStyle: 0,
  },
  '20260004': {
    mbti: 0,
    hometownRegion: 4,
    heightRange: 2,
    preferredHeightRange: 1,
    campusMode: 2,
    campusActivity: [3, 4],
    circleStyle: 1,
    weekend: 0,
    schedule: 1,
    energy: 2,
    exercise: 0,
    relax: [1, 4, 3],
    pets: 1,
    socialFrequency: 1,
    smoking: 2,
    drinking: 1,
    spendingStyle: 1,
    values: [3, 6, 8],
    relationshipGoal: 0,
    pace: 2,
    distance: 0,
    planning: 0,
    partnerPreference: 0,
    conflictStyle: 3,
    reassuranceNeed: 2,
    ambition: 0,
    familyCloseness: 2,
    replyStyle: 1,
    chatFrequency: 2,
    directness: 2,
    apologyStyle: 3,
    loveLanguage: [4, 0, 5],
    personalSpace: 0,
    publicAffection: 2,
    socialMedia: 2,
    dateStyle: [4, 0],
    diet: 1,
    travelStyle: 0,
  },
  '20260005': {
    mbti: 7,
    hometownRegion: 1,
    heightRange: 1,
    preferredHeightRange: 2,
    campusMode: 1,
    campusActivity: [2, 5],
    circleStyle: 1,
    weekend: 2,
    schedule: 1,
    energy: 1,
    exercise: 1,
    relax: [0, 5, 3],
    pets: 0,
    socialFrequency: 0,
    smoking: 1,
    drinking: 0,
    spendingStyle: 0,
    values: [2, 7, 4],
    relationshipGoal: 2,
    pace: 1,
    distance: 1,
    planning: 1,
    partnerPreference: 0,
    conflictStyle: 2,
    reassuranceNeed: 0,
    ambition: 2,
    familyCloseness: 0,
    replyStyle: 0,
    chatFrequency: 0,
    directness: 0,
    apologyStyle: 0,
    loveLanguage: [1, 2, 5],
    personalSpace: 2,
    publicAffection: 0,
    socialMedia: 0,
    dateStyle: [3, 2],
    diet: 0,
    travelStyle: 1,
  },
  '20260006': {
    mbti: 9,
    hometownRegion: 0,
    heightRange: 2,
    preferredHeightRange: 1,
    campusMode: 0,
    campusActivity: [0, 4],
    circleStyle: 0,
    weekend: 1,
    schedule: 0,
    energy: 2,
    exercise: 1,
    relax: [3, 8, 2],
    pets: 0,
    socialFrequency: 2,
    smoking: 3,
    drinking: 2,
    spendingStyle: 2,
    values: [0, 4, 5],
    relationshipGoal: 1,
    pace: 0,
    distance: 2,
    planning: 2,
    partnerPreference: 1,
    conflictStyle: 1,
    reassuranceNeed: 1,
    ambition: 2,
    familyCloseness: 1,
    replyStyle: 1,
    chatFrequency: 1,
    directness: 1,
    apologyStyle: 3,
    loveLanguage: [0, 4, 1],
    personalSpace: 1,
    publicAffection: 2,
    socialMedia: 1,
    dateStyle: [0, 1],
    diet: 2,
    travelStyle: 3,
  },
  '20260007': {
    mbti: 8,
    hometownRegion: 3,
    heightRange: 2,
    preferredHeightRange: 1,
    campusMode: 0,
    campusActivity: [0, 1],
    circleStyle: 0,
    weekend: 0,
    schedule: 2,
    energy: 0,
    exercise: 1,
    relax: [2, 7, 8],
    pets: 1,
    socialFrequency: 3,
    smoking: 3,
    drinking: 2,
    spendingStyle: 1,
    values: [0, 6, 5],
    relationshipGoal: 1,
    pace: 0,
    distance: 0,
    planning: 0,
    partnerPreference: 1,
    conflictStyle: 1,
    reassuranceNeed: 3,
    ambition: 3,
    familyCloseness: 3,
    replyStyle: 1,
    chatFrequency: 1,
    directness: 3,
    apologyStyle: 1,
    loveLanguage: [0, 4, 5],
    personalSpace: 0,
    publicAffection: 3,
    socialMedia: 2,
    dateStyle: [0, 1],
    diet: 2,
    travelStyle: 0,
  },
  '20260008': {
    mbti: 13,
    hometownRegion: 2,
    heightRange: 1,
    preferredHeightRange: 2,
    campusMode: 3,
    campusActivity: [0, 5],
    circleStyle: 2,
    weekend: 0,
    schedule: 2,
    energy: 0,
    exercise: 1,
    relax: [2, 3, 6],
    pets: 0,
    socialFrequency: 2,
    smoking: 2,
    drinking: 2,
    spendingStyle: 2,
    values: [5, 9, 0],
    relationshipGoal: 1,
    pace: 0,
    distance: 2,
    planning: 2,
    partnerPreference: 1,
    conflictStyle: 1,
    reassuranceNeed: 1,
    ambition: 2,
    familyCloseness: 1,
    replyStyle: 1,
    chatFrequency: 1,
    directness: 1,
    apologyStyle: 3,
    loveLanguage: [0, 1, 4],
    personalSpace: 1,
    publicAffection: 2,
    socialMedia: 3,
    dateStyle: [0, 2],
    diet: 2,
    travelStyle: 3,
  },
};

const TEST_USERS = ['20260001', '20260002', '20260003', '20260004', '20260005', '20260006', '20260007', '20260008'];

async function signInExistingUser(client, email, password) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) {
    throw new Error(`No user returned for ${email}`);
  }
  return data.user;
}

async function main() {
  const fileEnv = loadEnvFile(path.join(projectRoot, '.env'));
  const env = { ...fileEnv, ...process.env };
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
  const emailDomain = env.VITE_STUDENT_EMAIL_DOMAIN || 'swudate.local';
  const defaultPassword = env.SEED_TEST_USER_PASSWORD || 'Test1234!';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.');
  }

  const questionSource = extractQuestionSection(fs.readFileSync(path.join(projectRoot, 'src', 'data', 'questions.ts'), 'utf8'));
  const optionsById = extractOptionsById(questionSource);

  for (const studentId of TEST_USERS) {
    const plan = PROFILE_PLANS[studentId];
    if (!plan) {
      throw new Error(`Missing plan for ${studentId}`);
    }

    const client = createAnonClient(supabaseUrl, supabaseAnonKey);
    const user = await signInExistingUser(client, toEmail(studentId, emailDomain), defaultPassword);

    const [{ data: userRow, error: userError }, { data: answerRows, error: answerError }] = await Promise.all([
      client.from('users').select('grade,college').eq('id', user.id).single(),
      client.from('profile_answers').select('question_id,answer').eq('user_id', user.id),
    ]);

    if (userError) throw userError;
    if (answerError) throw answerError;

    const mergedAnswers = Object.fromEntries((answerRows ?? []).map((row) => [row.question_id, row.answer]));
    mergedAnswers.grade = userRow.grade;
    mergedAnswers.college = userRow.college;

    for (const [questionId, spec] of Object.entries(plan)) {
      mergedAnswers[questionId] = resolveOptionValue(optionsById, questionId, spec);
    }

    const payload = Object.entries(mergedAnswers).map(([questionId, answer]) => ({
      user_id: user.id,
      question_id: questionId,
      answer,
    }));

    const { error: upsertError } = await client.from('profile_answers').upsert(payload, { onConflict: 'user_id,question_id' });
    if (upsertError) throw upsertError;

    const { error: profileError } = await client
      .from('users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', user.id);
    if (profileError) throw profileError;

    console.log(`${studentId}: upserted ${payload.length} answers`);
    await client.auth.signOut();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
