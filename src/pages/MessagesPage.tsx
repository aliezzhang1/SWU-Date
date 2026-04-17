import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BottomNav } from '../components/layout/BottomNav';
import { Avatar } from '../components/ui/Avatar';
import {
  getContactShareStatusLabel,
  getContactTypeLabel,
} from '../services/contactShares';
import { useContactShareStore } from '../store/contactShareStore';
import { useMatchStore } from '../store/matchStore';
import { formatMessageTime } from '../utils/format';

export function MessagesPage() {
  const matches = useMatchStore((state) => state.matches);
  const fetchMatches = useMatchStore((state) => state.fetchMatches);
  const summaryMap = useContactShareStore((state) => state.summaryMap);
  const pendingApprovalCount = useContactShareStore((state) => state.pendingApprovalCount);
  const fetchSummaries = useContactShareStore((state) => state.fetchSummaries);

  useEffect(() => {
    void fetchMatches();
    void fetchSummaries();
  }, [fetchMatches, fetchSummaries]);

  return (
    <main className="app-page app-page--messages">
      <section className="page-shell stack-md">
        <header className="topbar topbar--compact">
          <div>
            <span className="eyebrow">匹配与联系方式</span>
            <h1>每周配对里已经来到你面前的人</h1>
            <p className="section-caption">
              {pendingApprovalCount > 0 ? `有 ${pendingApprovalCount} 段匹配正在等你决定是否展示联系方式。` : '每周五 21:00 只会发放 1 位最契合的人，双方都点头后才会互相看到联系方式。'}
            </p>
          </div>
        </header>

        {matches.length === 0 ? (
          <article className="empty-state">
            <h2>还没有每周配对结果</h2>
            <p>先去首页看看本轮状态，系统会在每周五 21:00 揭晓 1 位最契合的人。</p>
            <Link className="button button--primary" to="/home">
              去首页
            </Link>
          </article>
        ) : (
          <div className="stack-sm">
            {matches.map((match) => {
              const summary = summaryMap[match.id] ?? {
                matchId: match.id,
                myContactType: null,
                myContactValue: null,
                myIsShared: false,
                partnerIsShared: false,
                partnerContactType: null,
                partnerContactValue: null,
                status: 'waiting_me' as const,
              };
              const statusLabel = getContactShareStatusLabel(summary);
              const badgeToneClass = summary.status === 'both_shared'
                ? 'status-pill--success'
                : summary.partnerIsShared && !summary.myIsShared
                  ? 'status-pill--warning'
                  : 'status-pill--neutral';

              return (
                <Link key={match.id} className="list-card list-card--match" to={`/matches/${match.id}`}>
                  <Avatar src={match.partner.avatarUrl} name={match.partner.nickname} />
                  <div className="list-card__content">
                    <div className="match-list-card__top">
                      <div className="match-list-card__identity">
                        <strong>{match.partner.nickname}</strong>
                        <span>{formatMessageTime(match.matchedAt ?? match.createdAt)}</span>
                      </div>
                      <span className={`status-pill ${badgeToneClass}`}>
                        {summary.status === 'both_shared'
                          ? `${getContactTypeLabel(summary.partnerContactType)}已解锁`
                          : summary.partnerIsShared && !summary.myIsShared
                            ? '等你点头'
                            : summary.myIsShared
                              ? '等对方'
                              : '待决定'}
                      </span>
                    </div>
                    <div className="match-list-card__brief">
                      <strong>{statusLabel}</strong>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
      <BottomNav />
    </main>
  );
}
