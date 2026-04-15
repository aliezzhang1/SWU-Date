import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerStudentAccount } from '../services/auth';
import { isValidNickname, isValidPassword, isValidStudentId } from '../utils/validators';
import { pushToast } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import type { Gender } from '../types/domain';

export function RegisterPage() {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<Gender>('prefer_not_say');
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidStudentId(studentId)) {
      pushToast('error', '学号格式不对', '请输入 8~12 位纯数字学号。');
      return;
    }
    if (!isValidPassword(password)) {
      pushToast('error', '密码不够安全', '请至少输入 8 位，并同时包含字母和数字。');
      return;
    }
    if (password !== confirmPassword) {
      pushToast('error', '两次密码不一致');
      return;
    }
    if (!isValidNickname(nickname)) {
      pushToast('error', '昵称长度不合适', '昵称请控制在 2~12 个字。');
      return;
    }
    if (!agreed) {
      pushToast('error', '请先阅读并同意说明', '注册前需要勾选隐私政策和免责声明。');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerStudentAccount({ studentId, password, nickname, gender });
      await useAuthStore.getState().initialize();
      pushToast('success', '注册成功', '先做一个轻量问卷，我们再开始推荐。');
      navigate(result.session ? '/onboarding' : '/login', { replace: true });
    } catch (error) {
      console.error(error);
      pushToast('error', '注册失败', error instanceof Error ? error.message : '请稍后再试。');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="eyebrow">SWU Date</span>
        <h1>用学号开一个温柔一点的开始</h1>
        <p>首版先完成学号 + 密码注册，后续再补充简单验证问题。</p>

        <form className="stack-md" onSubmit={handleSubmit}>
          <label className="field">
            <span>学号</span>
            <input value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="请输入 8~12 位学号" />
          </label>
          <label className="field">
            <span>密码</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 8 位，含字母和数字" />
          </label>
          <label className="field">
            <span>确认密码</span>
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="再输入一次密码" />
          </label>
          <label className="field">
            <span>昵称</span>
            <input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="2~12 个字就好" />
          </label>
          <label className="field">
            <span>性别</span>
            <select value={gender} onChange={(event) => setGender(event.target.value as Gender)}>
              <option value="male">男</option>
              <option value="female">女</option>
              <option value="other">其他</option>
              <option value="prefer_not_say">不愿透露</option>
            </select>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
            <span>
              我已阅读并同意 <Link to="/legal/privacy">隐私政策</Link> 与 <Link to="/legal/disclaimer">免责声明</Link>
            </span>
          </label>
          <button className="button button--primary button--block" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '注册中...' : '注册并开始'}
          </button>
        </form>

        <p className="inline-hint">
          已有账号？<Link to="/login">去登录</Link>
        </p>
      </section>
    </main>
  );
}
