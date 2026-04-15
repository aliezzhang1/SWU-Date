import { useEffect, useState } from 'react';
import { Avatar } from '../components/ui/Avatar';
import { getBlocklist, unblockUser } from '../services/blocklist';
import { useAuthStore } from '../store/authStore';
import { pushToast } from '../store/uiStore';

export function BlocklistPage() {
  const user = useAuthStore((state) => state.user);
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof getBlocklist>>>([]);

  useEffect(() => {
    if (!user) return;
    void getBlocklist(user.id).then(setEntries).catch((error) => {
      console.error(error);
      pushToast('error', '黑名单加载失败');
    });
  }, [user]);

  if (!user) return null;

  return (
    <main className="app-page">
      <section className="page-shell stack-lg">
        <header className="section-heading section-heading--left">
          <span className="eyebrow">黑名单</span>
          <h1>你屏蔽过的人都在这里</h1>
        </header>

        {entries.length === 0 ? (
          <article className="empty-state">
            <h2>还没有屏蔽任何人</h2>
            <p>如果以后想把某个人从推荐和联系方式授权里隐藏，可以在资料页或匹配详情页操作。</p>
          </article>
        ) : (
          <div className="stack-sm">
            {entries.map((entry) => (
              <article key={entry.id} className="list-card">
                <Avatar src={entry.profile?.avatarUrl} name={entry.profile?.nickname ?? '已屏蔽用户'} />
                <div className="list-card__content">
                  <strong>{entry.profile?.nickname}</strong>
                  <p>屏蔽于 {new Date(entry.createdAt).toLocaleDateString('zh-CN')}</p>
                </div>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={async () => {
                    if (!entry.profile) return;
                    await unblockUser(user.id, entry.profile.id);
                    setEntries((current) => current.filter((item) => item.id !== entry.id));
                    pushToast('success', '已解除屏蔽');
                  }}
                >
                  解除
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

