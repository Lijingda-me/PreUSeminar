import React from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Check, ChevronLeft, MessageCircle, UserRound, X } from 'lucide-react';
import AppShell from '../components/AppShell';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import { api } from '../api/client';
import { useToastStore } from '../store/toastStore';

function roleLabel(role) {
  if (role === 'learner') return 'Student';
  if (role === 'mentor') return 'Mentor';
  return role || 'Member';
}

function requestTime(request) {
  const raw = request.createdAt;
  if (!raw) return 'Recently';
  return new Date(raw).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Inbox() {
  const [requests, setRequests] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loadingId, setLoadingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const showToast = useToastStore((state) => state.showToast);
  const navigate = useNavigate();

  async function load(markViewed = true) {
    try {
      setLoadError('');
      const { data } = await api.get('/matching/inbox', { params: { markViewed } });
      setRequests(data.requests || []);
      setUnreadMessages(data.unreadMessages || 0);
    } catch {
      setRequests([]);
      setUnreadMessages(0);
      setLoadError('Inbox could not load right now.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(true); }, []);

  async function accept(request) {
    setLoadingId(request.id);
    try {
      const { data } = await api.post(`/matching/requests/${request.id}/accept`);
      showToast('Request accepted. Chat is ready.');
      setRequests((items) => items.filter((item) => item.id !== request.id));
      navigate(`/messages/${data.match.id}`);
    } finally {
      setLoadingId('');
    }
  }

  async function decline(request) {
    setLoadingId(request.id);
    try {
      await api.post(`/matching/requests/${request.id}/decline`);
      showToast('Request declined');
      setRequests((items) => items.filter((item) => item.id !== request.id));
    } finally {
      setLoadingId('');
    }
  }

  return (
    <AppShell>
      <header className="mb-5 flex items-center gap-3">
        <Link to="/swipe" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-brand-text shadow-soft" aria-label="Back to swipe">
          <ChevronLeft />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-brand-muted">BridgeUp</p>
          <h1 className="text-3xl font-black">Inbox</h1>
        </div>
        <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-brand-blue text-white">
          <Bell />
          {requests.length + unreadMessages > 0 && (
            <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-brand-coral px-1 text-[11px] font-black text-white">
              {requests.length + unreadMessages}
            </span>
          )}
        </div>
      </header>

      {unreadMessages > 0 && (
        <Link to="/messages" className="mb-4 flex items-center gap-3 rounded-[24px] bg-white p-4 shadow-soft">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-blue text-white"><MessageCircle size={20} /></span>
          <span className="min-w-0 flex-1">
            <b className="block">Unread messages</b>
            <span className="text-sm font-semibold text-brand-muted">{unreadMessages} message{unreadMessages === 1 ? '' : 's'} waiting</span>
          </span>
        </Link>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-black">Mentorship requests</h2>
        {loading && <div className="rounded-[28px] bg-white/80 p-6 text-center font-semibold text-brand-muted shadow-soft">Loading inbox...</div>}
        {loadError && !loading && (
          <div className="rounded-[28px] bg-white/80 p-6 text-center shadow-soft">
            <h3 className="text-xl font-black">Inbox unavailable</h3>
            <p className="mt-2 text-sm font-semibold text-brand-muted">{loadError}</p>
            <Button className="mt-5" onClick={() => { setLoading(true); load(true); }}>Try again</Button>
          </div>
        )}
        {!loadError && requests.map((request) => (
          <article key={request.id} className="rounded-[28px] bg-white/90 p-4 shadow-soft">
            <div className="flex gap-3">
              <Avatar name={request.sender?.name} src={request.senderProfile?.photo} className="h-16 w-16 text-xl" rounded="rounded-[20px]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black">{request.sender?.name}</h3>
                    <p className="text-xs font-black text-brand-blue">{roleLabel(request.sender?.role)}</p>
                  </div>
                  <span className="shrink-0 text-right text-[11px] font-bold text-brand-muted">{requestTime(request)}</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-brand-muted">{request.senderProfile?.profession}</p>
                <p className="mt-2 line-clamp-2 text-sm leading-5 text-brand-muted">{request.senderSummary}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
              <Link to={`/profiles/${request.sender?.id}`} className="grid h-11 place-items-center rounded-full bg-brand-cream text-sm font-black text-brand-blue">
                <span className="flex items-center gap-2"><UserRound size={17} /> Profile</span>
              </Link>
              <button disabled={loadingId === request.id} onClick={() => decline(request)} className="grid h-11 w-11 place-items-center rounded-full bg-brand-coral/10 text-brand-coral" aria-label="Decline request">
                <X size={19} />
              </button>
              <button disabled={loadingId === request.id} onClick={() => accept(request)} className="grid h-11 w-11 place-items-center rounded-full bg-brand-green text-white" aria-label="Accept request">
                <Check size={20} />
              </button>
            </div>
          </article>
        ))}
        {!loading && !loadError && !requests.length && (
          <div className="rounded-[28px] bg-white/80 p-6 text-center shadow-soft">
            <h3 className="text-xl font-black">No pending requests</h3>
            <p className="mt-2 text-sm font-semibold text-brand-muted">New mentorship requests and unread actions will appear here.</p>
            <Button className="mt-5" onClick={() => load(true)}>Refresh</Button>
          </div>
        )}
      </section>
    </AppShell>
  );
}
