import React from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartHandshake } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

function homeFor(user) {
  if (!user.onboarded) return '/onboarding';
  if (user.role === 'staff') return '/staff';
  return user.role === 'admin' ? '/admin' : '/swipe';
}

export default function Splash() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const timer = setTimeout(() => navigate(user ? homeFor(user) : '/landing'), 1200);
    return () => clearTimeout(timer);
  }, [navigate, user]);

  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div className="space-y-6">
        <div className="mx-auto grid h-28 w-28 place-items-center rounded-[36px] bg-brand-blue text-white shadow-soft">
          <HeartHandshake size={54} />
        </div>
        <div>
          <h1 className="text-5xl font-black text-brand-text">WeMentor</h1>
          <p className="mt-3 text-lg font-semibold text-brand-muted">Mentorship across generations</p>
        </div>
      </div>
    </main>
  );
}
