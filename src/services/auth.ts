import type { Gender } from '../types/domain';
import { bootstrapUserProfile, fetchCurrentUserProfile } from './profile';
import { getSupabase, toStudentEmail } from './supabase';

interface RegisterInput {
  studentId: string;
  password: string;
  nickname: string;
  gender: Gender;
}

export async function registerStudentAccount(input: RegisterInput) {
  const supabase = getSupabase();
  const email = toStudentEmail(input.studentId);
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        student_id: input.studentId,
      },
    },
  });

  if (error) throw error;
  if (!data.user) {
    throw new Error('注册成功，但没有拿到用户信息，请重新登录。');
  }

  try {
    await bootstrapUserProfile(data.user.id, {
      student_id: input.studentId,
      nickname: input.nickname,
      gender: input.gender,
    });
  } catch (profileError) {
    console.warn('bootstrapUserProfile failed after sign up', profileError);
  }

  return data;
}

export async function loginWithStudentAccount(studentId: string, password: string) {
  const supabase = getSupabase();
  return supabase.auth.signInWithPassword({ email: toStudentEmail(studentId), password });
}

export async function signOutCurrentUser() {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function changeCurrentPassword(nextPassword: string) {
  const supabase = getSupabase();
  const { error } = await supabase.auth.updateUser({ password: nextPassword });
  if (error) throw error;
}

export async function deleteCurrentAccount() {
  const supabase = getSupabase();
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  await signOutCurrentUser();
}

export async function getLoggedInUserProfile() {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  return userId ? fetchCurrentUserProfile(userId) : null;
}

