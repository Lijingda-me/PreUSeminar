import React from 'react';
import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import ProfileCard from '../components/ProfileCard';
import { api } from '../api/client';
import { useToastStore } from '../store/toastStore';

export default function Swipe() {
  const [candidates, setCandidates] = useState([]);
  const [match, setMatch] = useState(null);
  const showToast = useToastStore((state) => state.showToast);

  async function load() {
    const { data } = await api.get('/matching/candidates');
    const strong = data.candidates.filter((item) => item.compatibility.score >= 60);
    setCandidates(strong.length ? strong : data.candidates);
  }

  useEffect(() => { load(); }, []);

  async function swipe(action) {
    const current = candidates[0];
    const { data } = await api.post('/matching/swipe', { targetUserId: current.user.id, action });
    setCandidates((items) => items.slice(1));
    if (data.match) setMatch({ ...data.match, other: current.user });
    else showToast(action === 'connect' ? 'Request sent' : action === 'skip' ? 'Passed' : 'Saved');
  }

  async function save() {
    const current = candidates[0];
    await api.post(`/profiles/save/${current.user.id}`);
    showToast('Saved to your profile');
  }

  async function report() {
    const current = candidates[0];
    await api.post('/safety/reports', { reportedUserId: current.user.id, reason: 'Safety concern', details: 'Reported from swipe card.' });
    showToast('Report sent for moderation');
  }

  return (
    <AppShell>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-bold text-brand-muted">BridgeUp</p>
          <h1 className="text-3xl font-black">Swipe to connect</h1>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-yellow"><Sparkles /></div>
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
      {candidates[0] ? (
        <div className="relative">
          {candidates[1] && <div className="absolute inset-x-6 top-4 h-[calc(100vh-210px)] rounded-[34px] bg-white/70 shadow-soft" />}
          <ProfileCard candidate={candidates[0]} onSwipe={swipe} onSave={save} onReport={report} />
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
