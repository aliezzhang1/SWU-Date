import { UserRound } from 'lucide-react';
import { toAvatarLabel } from '../../utils/format';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ src, name, size = 'md' }: AvatarProps) {
  const label = toAvatarLabel(name);
  const isLong = Array.from(label).length > 2;

  return (
    <div className={`avatar avatar--${size}`} aria-label={name}>
      {src ? (
        <img src={src} alt={name} loading="lazy" />
      ) : label ? (
        <span className={`avatar__label avatar__label--${size}${isLong ? ' avatar__label--long' : ''}`}>{label}</span>
      ) : (
        <UserRound size={18} />
      )}
    </div>
  );
}
