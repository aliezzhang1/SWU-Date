import { Heart, HeartHandshake, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useContactShareStore } from '../../store/contactShareStore';

const navItems = [
  { to: '/home', label: '首页', icon: HeartHandshake },
  { to: '/messages', label: '匹配', icon: Heart },
  { to: '/me', label: '我的', icon: UserRound },
] as const;

export function BottomNav() {
  const pendingApprovalCount = useContactShareStore((state) => state.pendingApprovalCount);

  return (
    <nav className="bottom-nav" aria-label="主导航">
      {navItems.map((item) => {
        const Icon = item.icon;
        const showBadge = item.to === '/messages' && pendingApprovalCount > 0;

        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `bottom-nav__item${isActive ? ' is-active' : ''}`}
          >
            <span className="bottom-nav__icon-wrap">
              <Icon size={20} />
              {showBadge ? <span className="bottom-nav__badge">{pendingApprovalCount > 99 ? '99+' : pendingApprovalCount}</span> : null}
            </span>
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

