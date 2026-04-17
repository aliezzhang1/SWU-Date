import { ChevronDown, Flag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ReportModal } from '../components/feedback/ReportModal';
import { Avatar } from '../components/ui/Avatar';
import { fetchPublicProfile } from '../services/profile';
import { submitReport } from '../services/reports';
import { useAuthStore } from '../store/authStore';
import { useMatchStore } from '../store/matchStore';
import { pushToast } from '../store/uiStore';
import { buildCompatibilityInsight, buildProfileTags } from '../utils/matching';

export function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const matches = useMatchStore((state) => state.matches);
  const dailySnapshot = useMatchStore((state) => state.dailySnapshot);
  const fetchMatches = useMatchStore((state) => state.fetchMatches);
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof fetchPublicProfile>>>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [showCompatibility, setShowCompatibility] = useState(false);

  useEffect(() => {
    if (!id) return;
    void fetchPublicProfile(id).then(setProfile).catch((error) => {
      console.error(error);
      pushToast('error', '资料加载失败', '这个人的资料暂时没加载出来。');
    });
    void fetchMatches();
  }, [fetchMatches, id]);

  const matchedThread = useMemo(() => matches.find((match) => match.partner.id === id), [id, matches]);
  const todayMatch = dailySnapshot?.match && dailySnapshot.match.partner.id === id ? dailySnapshot.match : null;
  const compatibilityInsight = useMemo(
    () => (user && profile && user.id !== profile.id ? buildCompatibilityInsight(user, profile) : null),
    [profile, user],
  );

  useEffect(() => {
    setShowCompatibility(false);
  }, [id]);

  if (!profile || !id) {
    return (
      <main className="app-page">
        <section className="page-shell empty-state">
          <h1>资料加载中...</h1>
        </section>
      </main>
    );
  }

  const tags = buildProfileTags(profile);
  const actionMatch = matchedThread ?? todayMatch;

  return (
    <main className="app-page">
      <section className="page-shell stack-lg">
        <header className="profile-hero">
          <Avatar src={profile.avatarUrl} name={profile.nickname} size="lg" />
          <div className="stack-sm">
            <span className="eyebrow">公开资料</span>
            <h1>{profile.nickname}</h1>
            <p>{profile.grade || '未填写年级'} · {profile.college || '未填写学院'}</p>
          </div>
        </header>

        <div className="tag-row">
          {tags.map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>

        <section className="info-card">
          <h2>一句话介绍</h2>
          <p>{profile.bio || '这个人暂时还没写简介。'}</p>
        </section>

        {compatibilityInsight ? (
          <div className="compatibility-reveal">
            <button
              type="button"
              className={`compatibility-trigger${showCompatibility ? ' is-open' : ''}`}
              onClick={() => setShowCompatibility((value) => !value)}
              aria-expanded={showCompatibility}
            >
              <span className="compatibility-trigger__copy">
                <span className="eyebrow">契合度说明</span>
                <strong>{showCompatibility ? '收起你们的契合度说明' : '点击查看你们哪里更容易合拍'}</strong>
              </span>
              <ChevronDown size={18} className="compatibility-trigger__icon" />
            </button>

            {showCompatibility ? (
              <section className="compatibility-panel">
                <div className="stack-sm">
                  <h2>{compatibilityInsight.headline}</h2>
                  <p>{compatibilityInsight.summary}</p>
                </div>
                <ul className="compatibility-list">
                  {compatibilityInsight.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}

        <section className="info-card">
          <h2>想对未来的 ta 说</h2>
          <blockquote>{typeof profile.answers.message === 'string' ? profile.answers.message : '先来一句嗨吧。'}</blockquote>
        </section>

        <section className="info-card">
          <h2>TA 的几个亮点</h2>
          <ul className="detail-list">
            <li>MBTI：{typeof profile.answers.mbti === 'string' ? profile.answers.mbti : '未填写'}</li>
            <li>周末偏好：{typeof profile.answers.weekend === 'string' ? profile.answers.weekend : '未填写'}</li>
            <li>理想约会：{Array.isArray(profile.answers.dateStyle) ? profile.answers.dateStyle.join(' / ') : '未填写'}</li>
            <li>饮食偏好：{typeof profile.answers.diet === 'string' ? profile.answers.diet : '未填写'}</li>
          </ul>
        </section>

        <section className="info-card info-card--subtle stack-sm">
          <span className="eyebrow">配对机制</span>
          <h2>现在改成每周五 21:00 自动配对</h2>
          <p>这一版不再支持手动“喜欢 / 划过”。系统会在每周五晚上 21:00 只发放 1 位最契合的人，资料页主要用于查看你已经得到的配对对象。</p>
        </section>

        <div className="page-actions">
          {actionMatch ? (
            <Link className="button button--primary button--block" to={`/matches/${actionMatch.id}`}>
              查看联系方式状态
            </Link>
          ) : (
            <Link className="button button--primary button--block" to="/home">
              回首页查看本轮配对
            </Link>
          )}
          <button type="button" className="button button--danger button--block" onClick={() => setIsReportOpen(true)}>
            <Flag size={18} />
            举报用户
          </button>
          <button type="button" className="button button--ghost button--block" onClick={() => navigate(-1)}>
            返回上一页
          </button>
        </div>
      </section>

      <ReportModal
        open={isReportOpen}
        targetName={profile.nickname}
        onClose={() => setIsReportOpen(false)}
        onSubmit={async (reason, detail) => {
          if (!user) return;
          await submitReport(user.id, id, reason, detail);
          pushToast('success', '感谢反馈', '我们会尽快处理，同时已帮你自动拉黑对方。');
          navigate('/home', { replace: true });
        }}
      />
    </main>
  );
}
