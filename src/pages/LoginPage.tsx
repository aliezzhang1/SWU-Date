import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginWithStudentAccount } from '../services/auth';
import { isOnboardingCompleteFromAnswers } from '../services/profile';
import { useAuthStore } from '../store/authStore';
import { pushToast } from '../store/uiStore';

export function LoginPage() {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await loginWithStudentAccount(studentId, password);
      if (error) throw error;

      await useAuthStore.getState().initialize();
      const profile = useAuthStore.getState().user;

      if (profile?.isBanned) {
        await useAuthStore.getState().signOut();
        pushToast('error', '账号已被封禁', '如果你认为有误，可以联系管理员。');
        return;
      }

      pushToast('success', '欢迎回来');
      navigate(profile && isOnboardingCompleteFromAnswers(profile.answers) ? '/home' : '/onboarding', { replace: true });
    } catch (error) {
      console.error(error);
      pushToast('error', '登录失败', error instanceof Error ? error.message : '请检查学号和密码。');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page auth-page--soft auth-page--liquid">
      <span className="liquid-orb liquid-orb--one" aria-hidden="true" />
      <span className="liquid-orb liquid-orb--two" aria-hidden="true" />
      <span className="liquid-orb liquid-orb--three" aria-hidden="true" />

      <section className="auth-card auth-card--liquid">
        <div className="auth-card__shine" aria-hidden="true" />
        <div className="auth-card__header">
        <span className="eyebrow">欢迎回来</span>
        <h1>继续看看今天有没有新的缘分</h1>
        <p>输入学号和密码即可登录，忘记密码可先联系管理员处理。</p>

        </div>

        <form className="stack-md" onSubmit={handleSubmit}>
          <label className="field">
            <span>学号</span>
            <input value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="输入学号" />
          </label>
          <label className="field">
            <span>密码</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="输入密码" />
          </label>
          <button className="button button--primary button--block" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="auth-links">
          <button type="button" className="text-button" onClick={() => pushToast('info', '忘记密码', '首版请联系管理员协助重置密码。')}>
            忘记密码
          </button>
          <span>
            还没有账号？<Link to="/register">去注册</Link>
          </span>
        </div>
      </section>
    </main>
  );
}
