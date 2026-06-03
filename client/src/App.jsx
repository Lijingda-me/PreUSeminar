import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Splash from './pages/Splash';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import RoleSelection from './pages/RoleSelection';
import Onboarding from './pages/Onboarding';
import Swipe from './pages/Swipe';
import Inbox from './pages/Inbox';
import SearchPage from './pages/SearchPage';
import GroupPage from './pages/GroupPage';
import Matches from './pages/Matches';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import AdminDashboard from './pages/AdminDashboard';
import StaffSchedule from './pages/StaffSchedule';
import Toast from './components/Toast';
import AppTour from './components/AppTour';
import ProtectedRoute from './routes/ProtectedRoute';
import { useAuthStore } from './store/authStore';

function homeFor(user) {
  if (!user.onboarded) return '/onboarding';
  if (user.role === 'staff') return '/staff';
  return user.role === 'admin' ? '/admin' : '/swipe';
}

export default function App() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  return (
    <>
      <Routes location={location}>
        <Route path="/" element={<Splash />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/login" element={user ? <Navigate to={homeFor(user)} /> : <Auth mode="login" />} />
        <Route path="/signup" element={user ? <Navigate to="/onboarding" /> : <Auth mode="signup" />} />
        <Route path="/role" element={<RoleSelection />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/swipe" element={<Swipe />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/groups/:groupId" element={<GroupPage />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/group/:groupChatId" element={<Messages />} />
          <Route path="/messages/:matchId" element={<Messages />} />
          <Route path="/profiles/:userId" element={<PublicProfile />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/staff" element={<ProtectedRoute roles={['staff', 'admin']}><StaffSchedule /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <AppTour />
      <Toast />
    </>
  );
}
