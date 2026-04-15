import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QuestionCard } from '../components/questionnaire/QuestionCard';
import { ProgressBar } from '../components/questionnaire/ProgressBar';
import { QUESTION_MODULES, QUESTIONS } from '../data/questions';
import { saveAnswers, toAnswerArray, updateUserProfile } from '../services/profile';
import { useAuthStore } from '../store/authStore';
import { pushToast } from '../store/uiStore';
import type { QuestionValue } from '../types/question';

export function OnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const [answers, setAnswers] = useState<Record<string, QuestionValue>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setAnswers(user.answers);
      const firstMissingIndex = QUESTIONS.findIndex((question) => question.required && !user.answers[question.id]);
      setCurrentIndex(firstMissingIndex >= 0 ? firstMissingIndex : 0);
    }
  }, [user]);

  const currentQuestion = QUESTIONS[currentIndex];
  const currentModule = useMemo(
    () => QUESTION_MODULES.find((module) => module.id === currentQuestion.moduleId) ?? QUESTION_MODULES[0],
    [currentQuestion.moduleId],
  );

  function hasValue(value: QuestionValue | undefined) {
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(value?.toString().trim());
  }

  async function handleSubmit() {
    if (!user) return;

    setIsSubmitting(true);
    try {
      await saveAnswers(user.id, toAnswerArray(answers));
      await updateUserProfile(user.id, {
        grade: typeof answers.grade === 'string' ? answers.grade : '',
        college: typeof answers.college === 'string' ? answers.college : '',
        last_active_at: new Date().toISOString(),
      });
      await refreshProfile();
      pushToast('success', location.search.includes('mode=edit') ? '问卷已更新' : '画像完成', '现在开始给你推荐更合拍的人。');
      navigate('/home', { replace: true });
    } catch (submitError) {
      console.error(submitError);
      pushToast('error', '保存失败', submitError instanceof Error ? submitError.message : '请稍后重试。');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function goNext(nextAnswers: Record<string, QuestionValue> = answers) {
    if (currentQuestion.required && !hasValue(nextAnswers[currentQuestion.id])) {
      setError('这一题先选一下，我们再继续。');
      return;
    }

    setError('');
    if (currentIndex === QUESTIONS.length - 1) {
      await handleSubmit();
      return;
    }

    setCurrentIndex((index) => index + 1);
  }

  return (
    <main className="app-page app-page--questionnaire">
      <section className="page-shell stack-lg">
        <ProgressBar current={currentIndex + 1} total={QUESTIONS.length} />
        <header className="module-header">
          <span className="module-header__emoji">{currentModule.emoji}</span>
          <div>
            <span className="eyebrow">{currentModule.title}</span>
            <p>{currentModule.subtitle}</p>
          </div>
        </header>

        <QuestionCard
          question={currentQuestion}
          value={answers[currentQuestion.id]}
          error={error}
          onChange={(value) => {
            const nextAnswers = { ...answers, [currentQuestion.id]: value };
            setAnswers(nextAnswers);
            setError('');
            if (currentQuestion.type === 'single') {
              window.setTimeout(() => {
                void goNext(nextAnswers);
              }, 260);
            }
          }}
        />

        <div className="page-actions page-actions--between">
          <button type="button" className="button button--ghost" disabled={currentIndex === 0} onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}>
            上一题
          </button>
          <button type="button" className="button button--primary" disabled={isSubmitting} onClick={() => void goNext()}>
            {currentIndex === QUESTIONS.length - 1 ? (isSubmitting ? '提交中...' : '提交问卷') : '下一题'}
          </button>
        </div>
      </section>
    </main>
  );
}

