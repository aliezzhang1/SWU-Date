import { ChevronRight, FileText, PencilLine, Settings } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BottomNav } from '../components/layout/BottomNav';
import { Avatar } from '../components/ui/Avatar';
import { useAuthStore } from '../store/authStore';
import { useContactShareStore } from '../store/contactShareStore';
import { useMatchStore } from '../store/matchStore';

const actions = [
  { to: '/me/edit', icon: PencilLine, label: '编辑资料' },
  { to: '/onboarding?mode=edit', icon: FileText, label: '修改问卷' },
  { to: '/me/settings', icon: Settings, label: '设置' },
] as const;

export function MePage() {
  const user = useAuthStore((state) => state.user);
  const matches = useMatchStore((state) => state.matches);
  const fetchMatches = useMatchStore((state) => state.fetchMatches);
  const pendingApprovalCount = useContactShareStore((state) => state.pendingApprovalCount);
  const fetchSummaries = useContactShareStore((state) => state.fetchSummaries);

  useEffect(() => {
    void fetchMatches();
    void fetchSummaries();
  }, [fetchMatches, fetchSummaries]);

  if (!user) return null;

  return (
    <main className="app-page app-page--me">
      <section className="page-shell stack-lg">
        <header className="profile-panel profile-panel--me">
          <Avatar src={user.avatarUrl} name={user.nickname} size="lg" />
          <div className="profile-panel__identity">
            <span className="eyebrow">{'\u6211\u7684\u8d44\u6599'}</span>
            <h1>
              <span>{user.nickname}</span>
              {typeof user.answers.emoji === 'string' && user.answers.emoji ? (
                <span className="profile-panel__emoji">{user.answers.emoji}</span>
              ) : null}
            </h1>
            <p className="profile-panel__meta">{user.college || '\u5b66\u9662\u5f85\u8865\u5145'} {'\u00b7'} {user.grade || '\u5e74\u7ea7\u5f85\u8865\u5145'}</p>
          </div>
        </header>

        <section className="info-card stat-bar">
          <div>
            <strong>{matches.length}</strong>
            <span>已匹配</span>
          </div>
          <div>
            <strong>{pendingApprovalCount}</strong>
            <span>待我授权</span>
          </div>
          <div>
            <strong>{Object.keys(user.answers).length}</strong>
            <span>已答题数</span>
          </div>
        </section>

        <div className="stack-sm">
          <Link className="list-card list-card--action" to="/messages">
            <span className="feature-item__icon"><FileText size={18} /></span>
            <strong>匹配与联系方式</strong>
            <ChevronRight size={18} />
          </Link>
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.to} className="list-card list-card--action" to={action.to}>
                <span className="feature-item__icon"><Icon size={18} /></span>
                <strong>{action.label}</strong>
                <ChevronRight size={18} />
              </Link>
            );
          })}
          <Link className="list-card list-card--action" to="/legal/disclaimer">
            <span className="feature-item__icon"><FileText size={18} /></span>
            <strong>关于 SWU Date</strong>
            <ChevronRight size={18} />
          </Link>
        </div>
      </section>
      <BottomNav />
    </main>
  );
}

