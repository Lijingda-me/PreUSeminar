import React from 'react';
import BottomNav from './BottomNav';

export default function AppShell({ children, hideBottomNav = false }) {
  return (
    <main className="phone-screen mx-auto min-h-screen max-w-md safe-bottom px-5 pt-5">
      {children}
      {!hideBottomNav && <BottomNav />}
    </main>
  );
}
