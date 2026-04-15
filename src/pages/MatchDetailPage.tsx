import { ArrowLeft, Ban, Flag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ReportModal } from '../components/feedback/ReportModal';
import { Avatar } from '../components/ui/Avatar';
import {
  CONTACT_TYPE_OPTIONS,
  getContactShareStatusDescription,
  getContactShareStatusLabel,
  getContactShareSummary,
  getContactTypeLabel,
  revokeMyContactShare,
  shareMyContact,
} from '../services/contactShares';
import { getMatchDetail, unmatch } from '../services/matching';
import { submitReport } from '../services/reports';
import { useAuthStore } from '../store/authStore';
import { useContactShareStore } from '../store/contactShareStore';
import { useMatchStore } from '../store/matchStore';
import { pushToast } from '../store/uiStore';
import type { ContactShareSummary, ContactType, MatchWithProfile } from '../types/domain';
import { buildCompatibilityInsight } from '../utils/matching';
import { isPhoneLike, isValidContactValue } from '../utils/validators';

function createEmptySummary(matchId: string): ContactShareSummary {
  return {
    matchId,
    myContactType: null,
    myContactValue: null,
    myIsShared: false,
    partnerIsShared: false,
    partnerContactType: null,
    partnerContactValue: null,
    status: 'waiting_me',
  };
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function MatchDetailPage() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const fetchMatches = useMatchStore((state) => state.fetchMatches);
  const fetchSummaries = useContactShareStore((state) => state.fetchSummaries);
  const [match, setMatch] = useState<MatchWithProfile | null>(null);
  const [summary, setSummary] = useState<ContactShareSummary | null>(null);
  const [contactType, setContactType] = useState<ContactType>('wechat');
  const [contactValue, setContactValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  async function refreshDetail() {
    if (!matchId || !user) return;

    setIsLoading(true);
    try {
      const [matchDetail, contactSummary] = await Promise.all([
        getMatchDetail(matchId, user.id),
        getContactShareSummary(matchId),
      ]);

      setMatch(matchDetail);
      setSummary(contactSummary);
      setContactType(contactSummary.myContactType ?? 'wechat');
      setContactValue(contactSummary.myContactValue ?? '');
    } catch (error) {
      console.error(error);
      pushToast('error', '匹配详情加载失败', '请稍后再试。');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshDetail();
  }, [matchId, user?.id]);

  const selectedTypeMeta = useMemo(
    () => CONTACT_TYPE_OPTIONS.find((option) => option.value === contactType) ?? CONTACT_TYPE_OPTIONS[0],
    [contactType],
  );

  const compatibilityInsight = useMemo(
    () => (user && match ? buildCompatibilityInsight(user, match.partner) : null),
    [match, user],
  );

  if (!matchId) return null;

  const effectiveSummary = summary ?? createEmptySummary(matchId);
  const statusLabel = getContactShareStatusLabel(effectiveSummary);
  const statusDescription = getContactShareStatusDescription(effectiveSummary);

  async function handleShare() {
    if (!user || !match) return;

    if (!isValidContactValue(contactValue)) {
      pushToast('error', '联系方式格式不太对', '请填写 2 到 60 个字符的联系方式。');
      return;
    }

    if (contactType === 'phone' && !isPhoneLike(contactValue.trim())) {
      pushToast('error', '手机号格式不正确', '如果你选择手机号，请填写 11 位中国大陆手机号。');
      return;
    }

    setIsSubmitting(true);
    try {
      await shareMyContact(match.id, user.id, contactType, contactValue);
      const nextSummary = await getContactShareSummary(match.id);
      setSummary(nextSummary);
      setContactType(nextSummary.myContactType ?? contactType);
      setContactValue(nextSummary.myContactValue ?? contactValue.trim());
      await Promise.all([fetchSummaries(), fetchMatches()]);

      if (nextSummary.status === 'both_shared') {
        pushToast('success', '联系方式已解锁', '你们现在可以直接联系彼此了。');
      } else {
        pushToast('success', '你已同意展示联系方式', '现在等待对方也做出相同决定。');
      }
    } catch (error) {
      console.error(error);
      pushToast('error', '授权失败', error instanceof Error ? error.message : '请稍后再试。');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRevoke() {
    if (!user || !match) return;
    const confirmed = window.confirm('撤回后，对方将看不到你的联系方式，确定继续吗？');
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      await revokeMyContactShare(match.id, user.id);
      const nextSummary = await getContactShareSummary(match.id);
      setSummary(nextSummary);
      await Promise.all([fetchSummaries(), fetchMatches()]);
      pushToast('success', '已撤回联系方式展示');
    } catch (error) {
      console.error(error);
      pushToast('error', '撤回失败', '请稍后再试。');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="app-page">
        <section className="page-shell empty-state">
          <h1>正在整理这段匹配...</h1>
          <p>马上就把联系方式授权状态同步给你。</p>
        </section>
      </main>
    );
  }

  if (!match) {
    return (
      <main className="app-page">
        <section className="page-shell empty-state">
          <h1>这个匹配暂时打不开</h1>
          <p>可能已经取消匹配了，或者你还没有权限查看它。</p>
          <Link className="button button--primary" to="/messages">回到匹配列表</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="app-page">
      <section className="page-shell stack-lg">
        <header className="topbar topbar--compact match-detail-topbar">
          <button type="button" className="icon-button" onClick={() => navigate('/messages')} aria-label="返回匹配列表">
            <ArrowLeft size={20} />
          </button>
          <div className="match-detail__heading">
            <span className="eyebrow">联系方式授权</span>
            <h1>匹配详情</h1>
          </div>
        </header>

        <header className="profile-panel profile-panel--me match-profile-panel">
          <Avatar src={match.partner.avatarUrl} name={match.partner.nickname} size="lg" />
          <div className="profile-panel__identity">
            <span className="eyebrow">匹配对象</span>
            <h1>
              <span>{match.partner.nickname}</span>
            </h1>
            <p className="profile-panel__meta">
              {match.partner.college || '学院待补充'} {'·'} {match.partner.grade || '年级待补充'}
            </p>
          </div>
        </header>

        <section className="info-card stat-bar match-detail-stat-bar">
          <div>
            <strong>{match.score}%</strong>
            <span>契合度</span>
          </div>
          <div>
            <strong>{effectiveSummary.myIsShared ? '已授权' : '待确认'}</strong>
            <span>我的状态</span>
          </div>
          <div>
            <strong>{effectiveSummary.partnerIsShared ? '已点头' : '等待中'}</strong>
            <span>对方状态</span>
          </div>
        </section>

        <section className="info-card contact-status-card match-status-note stack-sm">
          <span className="eyebrow">当前状态</span>
          <h2>{statusLabel}</h2>
          <p>{statusDescription}</p>
        </section>

        {compatibilityInsight ? (
          <section className="info-card match-reason-card stack-sm">
            <span className="eyebrow">为什么匹配</span>
            <h2>{compatibilityInsight.headline}</h2>
            <p>{compatibilityInsight.summary}</p>
            <ul className="match-reason-list">
              {compatibilityInsight.reasons.slice(0, 4).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="info-card match-contact-form stack-md">
          <div className="stack-sm">
            <span className="eyebrow">我的决定</span>
            <h2>{effectiveSummary.myIsShared ? '你已经愿意展示联系方式了' : '你愿意展示联系方式吗？'}</h2>
            <p>只有双方都单独点头之后，彼此才会看到联系方式。你随时可以修改或撤回。</p>
          </div>

          <label className="field">
            <span>联系方式类型</span>
            <select value={contactType} onChange={(event) => setContactType(event.target.value as ContactType)}>
              {CONTACT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>联系方式内容</span>
            <input
              value={contactValue}
              maxLength={60}
              placeholder={selectedTypeMeta.placeholder}
              onChange={(event) => setContactValue(event.target.value)}
            />
            <small>{contactValue.trim().length}/60</small>
          </label>

          <div className="page-actions">
            <button type="button" className="button button--primary button--block" disabled={isSubmitting} onClick={() => void handleShare()}>
              {isSubmitting ? '提交中...' : effectiveSummary.myIsShared ? '更新我的联系方式' : '我愿意展示联系方式'}
            </button>
            {effectiveSummary.myIsShared ? (
              <button type="button" className="button button--ghost button--block" disabled={isSubmitting} onClick={() => void handleRevoke()}>
                撤回展示
              </button>
            ) : null}
          </div>
        </section>

        <section className="info-card info-card--subtle match-partner-status stack-sm">
          <span className="eyebrow">对方动态</span>
          <h2>{effectiveSummary.partnerIsShared ? `${match.partner.nickname} 已经点头了` : `等待 ${match.partner.nickname} 决定`}</h2>
          <p>
            {effectiveSummary.partnerIsShared
              ? '对方已经愿意展示联系方式了。如果你也同意，双方的联系方式会立刻解锁。'
              : '对方还没有点击“我愿意展示联系方式”。在那之前，任何联系方式都不会被公开。'}
          </p>
        </section>

        {effectiveSummary.status === 'both_shared' ? (
          <section className="info-card match-unlocked-card stack-md">
            <div className="stack-sm">
              <span className="eyebrow">联系方式已解锁</span>
              <h2>你们现在可以线下继续聊啦</h2>
              <p>下面展示的是双方都同意公开后的联系方式。</p>
            </div>

            <div className="contact-card-grid">
              <article className="contact-card">
                <div className="list-card__row">
                  <strong>我的联系方式</strong>
                  {effectiveSummary.myContactValue ? (
                    <button type="button" className="text-button" onClick={() => void copyText(effectiveSummary.myContactValue ?? '')}>
                      复制
                    </button>
                  ) : null}
                </div>
                <span className="contact-card__label">{getContactTypeLabel(effectiveSummary.myContactType)}</span>
                <p>{effectiveSummary.myContactValue || '尚未填写'}</p>
              </article>

              <article className="contact-card">
                <div className="list-card__row">
                  <strong>{match.partner.nickname} 的联系方式</strong>
                  {effectiveSummary.partnerContactValue ? (
                    <button type="button" className="text-button" onClick={() => void copyText(effectiveSummary.partnerContactValue ?? '')}>
                      复制
                    </button>
                  ) : null}
                </div>
                <span className="contact-card__label">{getContactTypeLabel(effectiveSummary.partnerContactType)}</span>
                <p>{effectiveSummary.partnerContactValue || '对方暂未填写'}</p>
              </article>
            </div>
          </section>
        ) : null}

        <div className="page-actions match-danger-actions">
          <button type="button" className="button button--danger button--block" onClick={() => setReportOpen(true)}>
            <Flag size={18} />
            举报用户
          </button>
          <button
            type="button"
            className="button button--ghost button--block"
            onClick={async () => {
              const confirmed = window.confirm('确认取消匹配吗？取消后将关闭这段联系方式授权关系。');
              if (!confirmed) return;
              await unmatch(match.id);
              await Promise.all([fetchMatches(), fetchSummaries()]);
              pushToast('success', '已取消匹配');
              navigate('/messages', { replace: true });
            }}
          >
            <Ban size={18} />
            取消匹配
          </button>
        </div>
      </section>

      <ReportModal
        open={reportOpen}
        targetName={match.partner.nickname}
        onClose={() => setReportOpen(false)}
        onSubmit={async (reason, detail) => {
          if (!user) return;
          await submitReport(user.id, match.partner.id, reason, detail);
          await Promise.all([fetchMatches(), fetchSummaries()]);
          pushToast('success', '举报已提交', '同时已帮你自动拉黑对方。');
          navigate('/home', { replace: true });
        }}
      />
    </main>
  );
}

