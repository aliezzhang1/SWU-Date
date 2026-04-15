import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '../components/ui/Avatar';
import { updateUserProfile, uploadAvatar } from '../services/profile';
import { useAuthStore } from '../store/authStore';
import { pushToast } from '../store/uiStore';
import { isValidBio, isValidNickname } from '../utils/validators';

export function EditProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : user?.avatarUrl ?? null), [file, user?.avatarUrl]);

  if (!user) return null;
  const currentUser = user;


  async function handleSave() {
    if (!isValidNickname(nickname)) {
      pushToast('error', '昵称长度不合适');
      return;
    }
    if (!isValidBio(bio)) {
      pushToast('error', '简介太长了', '请控制在 100 字以内。');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateUserProfile(currentUser.id, { nickname, bio });
      if (file) {
        await uploadAvatar(currentUser.id, file);
      }
      await refreshProfile();
      pushToast('success', '资料已更新');
      navigate('/me', { replace: true });
    } catch (error) {
      console.error(error);
      pushToast('error', '保存失败', error instanceof Error ? error.message : '请稍后再试。');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-page">
      <section className="page-shell stack-lg">
        <header className="section-heading section-heading--left">
          <span className="eyebrow">编辑资料</span>
          <h1>把公开资料整理得更像你一点</h1>
        </header>

        <section className="info-card stack-md">
          <Avatar src={previewUrl} name={nickname || currentUser.nickname} size="lg" />
          <label className="field">
            <span>更新头像</span>
            <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
          <label className="field">
            <span>昵称</span>
            <input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={12} />
          </label>
          <label className="field">
            <span>一句话简介</span>
            <textarea value={bio} maxLength={100} onChange={(event) => setBio(event.target.value)} />
            <small>{bio.length}/100</small>
          </label>
        </section>

        <div className="stack-sm">
          <button type="button" className="button button--primary button--block" disabled={isSubmitting} onClick={() => void handleSave()}>
            {isSubmitting ? '保存中...' : '保存修改'}
          </button>
          <Link className="button button--ghost button--block" to="/onboarding?mode=edit">
            去修改问卷
          </Link>
        </div>
      </section>
    </main>
  );
}


