import { Bell, CalendarDays, Clock3, Settings2, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BottomNav } from '../components/layout/BottomNav';
import { Avatar } from '../components/ui/Avatar';
import { useAuthStore } from '../store/authStore';
import { useContactShareStore } from '../store/contactShareStore';
import { useMatchStore } from '../store/matchStore';
import type { DailyMatchPhase, DailyMatchSnapshot } from '../types/domain';
import { buildCompatibilityInsight } from '../utils/matching';

function formatCountdown(targetIso: string) {
  const diff = Math.max(0, new Date(targetIso).getTime() - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [days, hours, minutes, seconds].map((value) => `${value}`.padStart(2, '0'));
}

function formatRevealTime(targetIso: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(targetIso));
}

function formatGradeRange(maxGradeDiff: number | null) {
  if (maxGradeDiff === null) return '不限年级';
  if (maxGradeDiff === 0) return '仅同年级';
  return `前后 ${maxGradeDiff} 级`;
}

function formatReminder(preferences: { reminderEnabled: boolean; reminderHour: number; reminderMinute: number }) {
  if (!preferences.reminderEnabled) return '已关闭';
  return `${String(preferences.reminderHour).padStart(2, '0')}:${String(preferences.reminderMinute).padStart(2, '0')}`;
}

function getRoundStatusLabel(phase: DailyMatchPhase) {
  switch (phase) {
    case 'matched':
      return '已揭晓';
    case 'unmatched':
      return '未匹配到';
    case 'processing':
      return '生成中';
    case 'complete_profile':
      return '待完成问卷';
    case 'gender_restricted':
      return '规则限制';
    default:
      return '等待今晚';
  }
}

function getHeroCopy(snapshot: DailyMatchSnapshot) {
  switch (snapshot.phase) {
    case 'matched':
      return {
        eyebrow: '今晚结果已送达',
        title: '这位，值得你认真看一眼',
        description: '我们只把同时通过条件和契合度筛选的人留在这里，让你把注意力放在真正值得认识的一个人身上。',
      };
    case 'unmatched':
      return {
        eyebrow: '今晚结果已揭晓',
        title: '今晚先把机会留给更合适的人',
        description: '如果暂时没有同时满足条件和契合度的人，我们宁可空一轮，也不为了有结果而随便塞一个人给你。',
      };
    case 'processing':
      return {
        eyebrow: '21:00 结果生成中',
        title: '今晚的结果正在统一送达',
        description: '这一轮会一次性为大家结算结果，通常几十秒内就会同步到你的首页。',
      };
    case 'complete_profile':
      return {
        eyebrow: '先拿到今晚的入场资格',
        title: '补完问卷，今晚才会有结果',
        description: '完整答案能帮我们判断边界、节奏和偏好，避免把不够合适的人推给你。',
      };
    case 'gender_restricted':
      return {
        eyebrow: '当前版本说明',
        title: '这一版先按男女互配发放结果',
        description: '我们先把每日一配的主链路做稳，后续会继续扩展更多匹配方案和身份选择。',
      };
    default:
      return {
        eyebrow: '下一次揭晓',
        title: '每天晚上21:00揭晓一位最契合的人',
        description: '把节奏慢下来，你会更容易看清谁是真的和你对频，而不是被很多人同时分散注意力。',
      };
  }
}

function getStatePills(snapshot: DailyMatchSnapshot) {
  const range = formatGradeRange(snapshot.preferences.maxGradeDiff);
  switch (snapshot.phase) {
    case 'matched':
      return ['今晚只发这一位', `当前按 ${range} 筛选`, '先看公开资料，再决定要不要继续'];
    case 'processing':
      return ['全站正在统一结算', '通常几十秒内同步', '稍后刷新即可'];
    case 'unmatched':
      return ['今晚没有硬凑一个结果', `当前按 ${range} 筛选`, '明晚 21:00 再揭晓'];
    case 'complete_profile':
      return ['补完核心问卷才能进池', '答案完整度会影响稳定性', '今晚前完成可参与下一轮'];
    case 'gender_restricted':
      return ['当前版本先支持男女互配', `当前按 ${range} 筛选`, '后续会扩展更多匹配方案'];
    default:
      return [`当前按 ${range} 筛选`, '21:00 统一揭晓'];
  }
}


export function HomePage() {
  const { dailySnapshot, isLoadingDaily, fetchDailySnapshot, fetchMatches } = useMatchStore();
  const fetchSummaries = useContactShareStore((state) => state.fetchSummaries);
  const user = useAuthStore((state) => state.user);
  const [openedMatchId, setOpenedMatchId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(['00', '00', '00', '00']);

  useEffect(() => {
    void (async () => {
      await fetchDailySnapshot();
      await fetchMatches();
      await fetchSummaries();
    })();
  }, [fetchDailySnapshot, fetchMatches, fetchSummaries]);

  useEffect(() => {
    if (!dailySnapshot?.nextMatchAt) return undefined;
    const tick = () => setCountdown(formatCountdown(dailySnapshot.nextMatchAt));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [dailySnapshot?.nextMatchAt]);

  useEffect(() => {
    if (dailySnapshot?.phase !== 'processing') return undefined;
    const timer = window.setTimeout(() => {
      void fetchDailySnapshot();
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [dailySnapshot?.phase, fetchDailySnapshot]);

  useEffect(() => {
    const matchId = dailySnapshot?.match?.id;
    if (!matchId) {
      setOpenedMatchId(null);
      return;
    }

    try {
      const storageKey = `swu-date:opened-match-letter:${matchId}`;
      setOpenedMatchId(window.localStorage.getItem(storageKey) === '1' ? matchId : null);
    } catch {
      setOpenedMatchId(null);
    }
  }, [dailySnapshot?.match?.id]);

  const compatibilityInsight = useMemo(
    () => (user && dailySnapshot?.match ? buildCompatibilityInsight(user, dailySnapshot.match.partner) : null),
    [dailySnapshot?.match, user],
  );

  const matchLetterSections = useMemo(() => {
    if (!dailySnapshot?.match) return [];

    const partner = dailySnapshot.match.partner;
    const partnerMessage =
      typeof partner.answers.message === 'string' && partner.answers.message.trim()
        ? partner.answers.message.trim()
        : '想先和你说声嗨，也想慢慢了解你。';
    const reasons = compatibilityInsight?.reasons ?? [];

    return [
      {
        title: '「TA 说」',
        body: partnerMessage,
      },
      {
        title: '「共鸣小组」',
        body: reasons[0] ?? '你们在一些关键偏好上有相近的答案，聊起来不需要太多解释。',
      },
      {
        title: '「价值共鸣」',
        body: reasons[1] ?? '你们对关系边界、真诚表达和相处节奏有类似期待。',
      },
      {
        title: '「生活方式」',
        body: reasons[2] ?? '作息、周末去处和放松方式上没有太大冲突，适合从低压力的认识开始。',
      },
      {
        title: '「相处节奏」',
        body: reasons[3] ?? '这份匹配不鼓励立刻冒进，更适合先看资料、再决定是否交换联系方式。',
      },
    ];
  }, [compatibilityInsight, dailySnapshot?.match]);

  const isMatchLetterOpened = dailySnapshot?.match ? openedMatchId === dailySnapshot.match.id : false;

  const handleOpenMatchLetter = () => {
    const matchId = dailySnapshot?.match?.id;
    if (!matchId) return;

    try {
      window.localStorage.setItem(`swu-date:opened-match-letter:${matchId}`, '1');
    } catch {
      // Local storage may be unavailable in private browsing; the in-memory state is enough for this visit.
    }

    setOpenedMatchId(matchId);
  };

  const heroCopy = dailySnapshot ? getHeroCopy(dailySnapshot) : null;
  const statePills = dailySnapshot ? getStatePills(dailySnapshot) : [];

  if (!dailySnapshot) {
    return (
      <main className="app-page app-page--home">
        <section className="page-shell page-shell--home">
          <article className="empty-state">
            <h2>{isLoadingDaily ? '正在整理配对结果...' : '每日配对加载中'}</h2>
            <p>我们正在同步你的问卷、偏好和本轮状态。</p>
          </article>
        </section>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="app-page app-page--home">
      <section className="page-shell page-shell--home stack-lg">
        <header className="topbar topbar--home">
          <div>
            <span className="eyebrow eyebrow--brand">SWU Date</span>
            <h1>{'\u5728\u897f\u5927\uff0c\u9047\u89c1\u5bf9\u7684\u4eba'}</h1>
          </div>
          <Link className="icon-button" to="/messages" aria-label="匹配与联系方式">
            <Bell size={20} />
          </Link>
        </header>

        <section className={`daily-match-hero daily-match-hero--${dailySnapshot.phase}`}>
          <div className="daily-match-hero__head">
            <div className="daily-match-hero__story">
              <span className="daily-match-hero__kicker">{heroCopy?.eyebrow}</span>
              <h2 className="daily-match-hero__title">
                {dailySnapshot.phase === 'waiting' ? (
                  <>
                    {'\u6bcf\u5929\u665a\u4e0a21:00'}
                    <br />
                    {'\u63ed\u6653\u4e00\u4f4d\u6700\u5951\u5408\u7684\u4eba'}
                  </>
                ) : (
                  heroCopy?.title
                )}
              </h2>
              <p className="daily-match-hero__description">{heroCopy?.description}</p>
            </div>
            <Link className="daily-match-hero__settings" to="/me/settings">
              <Settings2 size={16} />
              调整偏好
            </Link>
          </div>

          <div className="daily-match-countdown" aria-label="每日配对倒计时">
            {countdown.map((value, index) => (
              <div key={`${index}-${value}`} className="daily-match-countdown__item">
                <strong>{value}</strong>
                <span>{['天', '时', '分', '秒'][index]}</span>
              </div>
            ))}
          </div>

          <div className="daily-match-hero__footer">
            <p className="daily-match-hero__meta">{formatRevealTime(dailySnapshot.nextMatchAt)}</p>
            <div className="daily-match-pill-row">
              {statePills.map((pill) => (
                <span key={pill} className="daily-match-pill">{pill}</span>
              ))}
            </div>
          </div>

          <div className="daily-match-status-grid">
            <article className="daily-match-status-card">
              <span className="daily-match-status-card__icon"><Sparkles size={18} /></span>
              <div>
                <span className="eyebrow">问卷状态</span>
                <strong>{user ? '已完成' : '待登录'}</strong>
              </div>
            </article>
            <article className="daily-match-status-card">
              <span className="daily-match-status-card__icon"><Clock3 size={18} /></span>
              <div>
                <span className="eyebrow">本轮配对</span>
                <strong>{getRoundStatusLabel(dailySnapshot.phase)}</strong>
              </div>
            </article>
            <article className="daily-match-status-card">
              <span className="daily-match-status-card__icon"><CalendarDays size={18} /></span>
              <div>
                <span className="eyebrow">年级范围</span>
                <strong>{formatGradeRange(dailySnapshot.preferences.maxGradeDiff)}</strong>
              </div>
            </article>
            <article className="daily-match-status-card">
              <span className="daily-match-status-card__icon"><Bell size={18} /></span>
              <div>
                <span className="eyebrow">提醒时间</span>
                <strong>{formatReminder(dailySnapshot.preferences)}</strong>
              </div>
            </article>
          </div>
        </section>

        {dailySnapshot.phase === 'matched' && dailySnapshot.match ? (
          <article className={`match-letter-stage${isMatchLetterOpened ? ' is-open' : ''}`}>
            {!isMatchLetterOpened ? (
              <button type="button" className="match-envelope-card" onClick={handleOpenMatchLetter}>
                <span className="match-envelope-card__eyebrow">今晚匹配信</span>
                <div className="match-envelope" aria-hidden="true">
                  <span className="match-envelope__paper" />
                  <span className="match-envelope__body" />
                  <span className="match-envelope__fold match-envelope__fold--left" />
                  <span className="match-envelope__fold match-envelope__fold--right" />
                  <span className="match-envelope__flap" />
                  <span className="match-envelope__seal" />
                </div>
                <span className="match-envelope-card__title">一封未拆开的信</span>
                <span className="match-envelope-card__copy">点开后，看看你们的契合报告。</span>
                <span className="match-envelope-card__meta">{dailySnapshot.match.score}% 契合</span>
              </button>
            ) : (
              <section className="match-letter" aria-label="今晚的匹配报告">
                <div className="match-letter__topline">
                  <span>SWU DATE LETTER</span>
                  <span>{formatRevealTime(dailySnapshot.nextMatchAt)}</span>
                </div>

                <div className="match-letter__profile">
                  <Avatar src={dailySnapshot.match.partner.avatarUrl} name={dailySnapshot.match.partner.nickname} size="lg" />
                  <div className="match-letter__identity">
                    <Link className="match-letter__name" to={`/profile/${dailySnapshot.match.partner.id}`}>
                      {dailySnapshot.match.partner.nickname}
                    </Link>
                    <p>
                      {dailySnapshot.match.partner.grade || '未填写年级'} · {dailySnapshot.match.partner.college || '未填写学院'}
                    </p>
                  </div>
                  <div className="match-letter__score" aria-label="匹配度">
                    <strong>{dailySnapshot.match.score}</strong>
                    <span>% 契合</span>
                  </div>
                </div>

                <div className="match-letter__summary">
                  <span className="match-letter__label">为什么是 TA</span>
                  <h2>{compatibilityInsight?.headline ?? dailySnapshot.title}</h2>
                  <p>{compatibilityInsight?.summary ?? dailySnapshot.description}</p>
                </div>

                <dl className="match-letter__sections">
                  {matchLetterSections.map((section) => (
                    <div className="match-letter__section" key={section.title}>
                      <dt>{section.title}</dt>
                      <dd>{section.body}</dd>
                    </div>
                  ))}
                </dl>

                <div className="match-letter__actions">
                  <Link className="match-letter__action match-letter__action--primary" to={`/matches/${dailySnapshot.match.id}`}>
                    去确认联系方式
                  </Link>
                  <Link className="match-letter__action" to={`/profile/${dailySnapshot.match.partner.id}`}>
                    先看公开资料
                  </Link>
                </div>
              </section>
            )}
          </article>
        ) : (
          <article className={`daily-round-card daily-round-card--state daily-round-card--${dailySnapshot.phase}`}>
            <div className="daily-match-actions daily-match-actions--inline">
              {dailySnapshot.phase === 'complete_profile' ? (
                <Link className="button button--primary button--block" to="/onboarding">
                  {'去完成问卷'}
                </Link>
              ) : dailySnapshot.phase === 'processing' ? (
                <button type="button" className="button button--primary button--block" onClick={() => void fetchDailySnapshot()}>
                  {'刷新今晚结果'}
                </button>
              ) : (
                <Link className="button button--primary button--block" to="/me/settings">
                  {'调整匹配设置'}
                </Link>
              )}
              <Link className="button button--ghost button--block" to="/messages">
                {'查看匹配记录'}
              </Link>
            </div>
          </article>
        )}
      </section>
      <BottomNav />
    </main>
  );
}
