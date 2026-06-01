import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function ProtectedRoute({ roles, children }) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    const fallback = user.role === 'admin' ? '/admin' : user.role === 'staff' ? '/staff' : '/swipe';
    return <Navigate to={fallback} replace />;
  }
  if (!user.onboarded && !['/onboarding', '/role'].includes(location.pathname)) return <Navigate to="/onboarding" replace />;
  if (children) return children;
  return <Outlet />;
}
