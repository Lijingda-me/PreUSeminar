import React from 'react';
import { CalendarDays, HeartHandshake, MessageCircle, Search, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const items = [
  { to: '/swipe', label: 'Swipe', icon: Sparkles },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/matches', label: 'Matches', icon: HeartHandshake },
  { to: '/messages', label: 'Messages', icon: MessageCircle },
  { to: '/profile', label: 'Profile', icon: UserRound }
];

export default function BottomNav() {
  const user = useAuthStore((state) => state.user);
  const navItems = user?.role === 'admin'
    ? [
        { to: '/admin', label: 'Admin', icon: ShieldCheck },
        { to: '/staff', label: 'Schedule', icon: CalendarDays },
        { to: '/search', label: 'Search', icon: Search },
        { to: '/messages', label: 'Messages', icon: MessageCircle },
        { to: '/profile', label: 'Profile', icon: UserRound }
      ]
    : user?.role === 'staff'
    ? [
        { to: '/staff', label: 'Schedule', icon: CalendarDays },
        { to: '/search', label: 'Search', icon: Search },
        { to: '/matches', label: 'Matches', icon: HeartHandshake },
        { to: '/messages', label: 'Messages', icon: MessageCircle },
        { to: '/profile', label: 'Profile', icon: UserRound }
      ]
    : items;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-6 pb-4">
      <div className="grid grid-cols-5 rounded-[30px] bg-white px-2 py-3 shadow-soft">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center gap-1 rounded-2xl px-1 py-1 text-[10px] font-semibold ${isActive ? 'text-brand-blue' : 'text-brand-muted'}`}>
            {({ isActive }) => (
              <>
                <span className={isActive ? 'grid h-9 w-9 place-items-center rounded-full bg-brand-blue text-white' : 'grid h-9 w-9 place-items-center'}>
                  <Icon size={21} aria-hidden="true" />
                </span>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
