import React from 'react';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import ProfileCard from '../components/ProfileCard';
import { api } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { useAuthStore } from '../store/authStore';
import { tourCandidateFor, useTourStore } from '../store/tourStore';

export default function Swipe() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [candidates, setCandidates] = useState([]);
  const [match, setMatch] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const showToast = useToastStore((state) => state.showToast);
  const tourActive = useTourStore((state) => state.active);
  const tourStep = useTourStore((state) => state.step);
  const markSwipeTried = useTourStore((state) => state.markSwipeTried);
  const setTourStep = useTourStore((state) => state.setStep);
  const inSwipeTour = tourActive && tourStep === 0;
  const tourCandidate = tourCandidateFor(user?.role);

  async function load() {
    try {
      setLoadError('');
      const [candidateRes, inboxRes] = await Promise.allSettled([
        api.get('/matching/candidates'),
        api.get('/matching/inbox')
      ]);
      if (candidateRes.status === 'fulfilled') {
        const nextCandidates = candidateRes.value.data.candidates || [];
        const strong = nextCandidates.filter((item) => item.compatibility.score >= 60);
        setCandidates(strong.length ? strong : nextCandidates);
      } else {
        setCandidates([]);
        setLoadError('Swipe cards could not load right now.');
      }
      if (inboxRes.status === 'fulfilled') setUnreadCount(inboxRes.value.data.unreadCount || 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(() => {
      api.get('/matching/inbox').then(({ data }) => setUnreadCount(data.unreadCount || 0)).catch(() => {});
    }, 8000);
    return () => clearInterval(id);
  }, []);

  async function swipe(action) {
    if (inSwipeTour) {
      markSwipeTried();
      showToast(action === 'connect' ? 'Connection request demo complete' : 'Skip demo complete', 'info');
      window.setTimeout(() => {
        setTourStep(1);
        navigate('/search');
      }, 450);
      return;
    }
    const current = candidates[0];
    if (!current) return;
    const { data } = await api.post('/matching/swipe', { targetUserId: current.user.id, action });
    setCandidates((items) => items.slice(1));
    if (data.match) setMatch({ ...data.match, other: current.user });
    else showToast(action === 'connect' ? 'Request sent' : action === 'skip' ? 'Passed' : 'Saved');
  }

  async function save() {
    if (inSwipeTour) {
      showToast('Saved demo profile', 'info');
      return;
    }
    const current = candidates[0];
    if (!current) return;
    await api.post(`/profiles/save/${current.user.id}`);
    showToast('Saved to your profile');
  }

  async function report() {
    if (inSwipeTour) return;
    const current = candidates[0];
    if (!current) return;
    await api.post('/safety/reports', { reportedUserId: current.user.id, reason: 'Safety concern', details: 'Reported from swipe card.' });
    showToast('Report sent for moderation');
  }

  return (
    <AppShell>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-bold text-brand-muted">WeMentor</p>
          <h1 className="text-3xl font-black">Swipe to connect</h1>
        </div>
        <Link to="/inbox" className="relative grid h-12 w-12 place-items-center rounded-2xl bg-brand-blue text-white shadow-soft" aria-label="Inbox">
          <Bell />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-brand-coral px-1 text-[11px] font-black text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
      </header>
      {match && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-brand-text/60 p-5 backdrop-blur">
          <div className="animate-[menuIn_180ms_ease-out] rounded-[32px] bg-white p-6 text-center shadow-soft">
            <div className="mx-auto mb-3 grid h-20 w-20 place-items-center rounded-full bg-brand-green text-4xl text-white">✓</div>
            <h2 className="text-3xl font-black">Mutual match</h2>
            <p className="mt-2 text-brand-muted">You and {match.other.name} can now message safely.</p>
            <Button className="mt-5 w-full" onClick={() => setMatch(null)}>Keep swiping</Button>
          </div>
        </div>
      )}
      {loading && !inSwipeTour ? (
        <div className="rounded-[32px] bg-white/80 p-8 text-center shadow-soft">
          <h2 className="text-2xl font-black">Loading cards</h2>
          <p className="mt-2 text-brand-muted">Getting your latest recommendations.</p>
        </div>
      ) : loadError && !inSwipeTour ? (
        <div className="rounded-[32px] bg-white/80 p-8 text-center shadow-soft">
          <h2 className="text-2xl font-black">Could not load cards</h2>
          <p className="mt-2 text-brand-muted">{loadError}</p>
          <Button className="mt-5" onClick={() => { setLoading(true); load(); }}>Try again</Button>
        </div>
      ) : (inSwipeTour || candidates[0]) ? (
        <div className="relative" data-tour="swipe-card">
          {!inSwipeTour && candidates[1] && <div className="absolute inset-x-6 top-4 h-[calc(100vh-210px)] rounded-[34px] bg-white/70 shadow-soft" />}
          <ProfileCard candidate={inSwipeTour ? tourCandidate : candidates[0]} onSwipe={swipe} onSave={save} onReport={report} />
        </div>
      ) : (
        <div className="rounded-[32px] bg-white/80 p-8 text-center shadow-soft">
          <h2 className="text-2xl font-black">No more cards right now</h2>
          <p className="mt-2 text-brand-muted">Try search, join a group, or check back after more mentors and learners onboard.</p>
          <Button className="mt-5" onClick={load}>Refresh</Button>
        </div>
      )}
    </AppShell>
  );
}
