import { Heart, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MatchWithProfile } from '../../types/domain';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../ui/Avatar';

interface MatchSuccessModalProps {
  match: MatchWithProfile;
  onClose: () => void;
}

const PARTICLES = [
  { left: '8%', top: '10%', delay: '0s', duration: '3.6s', size: '10px' },
  { left: '18%', top: '6%', delay: '0.35s', duration: '4.1s', size: '12px' },
  { left: '30%', top: '14%', delay: '0.7s', duration: '3.8s', size: '9px' },
  { left: '44%', top: '8%', delay: '1.1s', duration: '4.4s', size: '13px' },
  { left: '58%', top: '14%', delay: '1.5s', duration: '3.9s', size: '10px' },
  { left: '72%', top: '7%', delay: '0.6s', duration: '4.2s', size: '11px' },
  { left: '86%', top: '12%', delay: '1.2s', duration: '3.7s', size: '10px' },
  { left: '10%', top: '32%', delay: '0.2s', duration: '4.3s', size: '8px' },
  { left: '90%', top: '30%', delay: '0.9s', duration: '3.5s', size: '12px' },
  { left: '6%', top: '56%', delay: '1.4s', duration: '4.2s', size: '11px' },
  { left: '92%', top: '54%', delay: '0.5s', duration: '3.9s', size: '9px' },
  { left: '12%', top: '78%', delay: '1.1s', duration: '4s', size: '12px' },
  { left: '24%', top: '88%', delay: '0.4s', duration: '3.6s', size: '10px' },
  { left: '40%', top: '84%', delay: '1.3s', duration: '4.5s', size: '8px' },
  { left: '58%', top: '90%', delay: '0.8s', duration: '3.8s', size: '11px' },
  { left: '74%', top: '85%', delay: '1.6s', duration: '4.1s', size: '10px' },
  { left: '88%', top: '76%', delay: '0.3s', duration: '4.3s', size: '13px' },
  { left: '50%', top: '4%', delay: '1.8s', duration: '4.4s', size: '9px' },
] as const;

export function MatchSuccessModal({ match, onClose }: MatchSuccessModalProps) {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="modal-backdrop modal-backdrop--celebration" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="match-modal" onClick={(event) => event.stopPropagation()}>
        <div className="match-modal__sparkles" aria-hidden="true">
          {PARTICLES.map((particle, index) => (
            <span
              key={index}
              className={`spark spark--${index % 3}`}
              style={{
                left: particle.left,
                top: particle.top,
                animationDelay: particle.delay,
                animationDuration: particle.duration,
                width: particle.size,
                height: particle.size,
              }}
            />
          ))}
        </div>

        <span className="eyebrow match-modal__eyebrow">
          <Sparkles size={14} />
          Match Success
        </span>
        <h2>你们匹配啦! ??</h2>
        <p className="match-modal__lead">互相喜欢只是第一步，接下来要由你们各自决定是否展示联系方式。</p>

        <div className="match-modal__avatars">
          <div className="match-modal__avatar-stack">
            <Avatar src={user?.avatarUrl ?? null} name={user?.nickname ?? '我'} size="lg" />
            <span>{user?.nickname ?? '你'}</span>
          </div>
          <div className="match-modal__heart-link" aria-hidden="true">
            <span className="match-modal__heart-line" />
            <span className="match-modal__heart">
              <Heart size={18} fill="currentColor" />
            </span>
            <span className="match-modal__heart-line" />
          </div>
          <div className="match-modal__avatar-stack">
            <Avatar src={match.partner.avatarUrl} name={match.partner.nickname} size="lg" />
            <span>{match.partner.nickname}</span>
          </div>
        </div>

        <p className="match-modal__score">{match.score}% 契合</p>

        <div className="modal-actions">
          <Link className="button button--primary" to={`/matches/${match.id}`} onClick={onClose}>
            去填写联系方式
          </Link>
          <button type="button" className="button button--ghost" onClick={onClose}>
            继续逛逛
          </button>
        </div>
      </div>
    </div>
  );
}

