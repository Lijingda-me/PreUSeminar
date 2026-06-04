import React from 'react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Award, Briefcase, CalendarDays, CheckCircle2, ChevronLeft, Languages, Send, Star } from 'lucide-react';
import AppShell from '../components/AppShell';
import Avatar from '../components/Avatar';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { tourCandidateFor, tourPeerIdFor, useTourStore } from '../store/tourStore';

export default function PublicProfile() {
  const { userId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const showToast = useToastStore((state) => state.showToast);
  const tourActive = useTourStore((state) => state.active);
  const tourStep = useTourStore((state) => state.step);
  const setTourStep = useTourStore((state) => state.setStep);
  const tourCandidate = tourCandidateFor(currentUser?.role);
  const tourPeerId = tourPeerIdFor(currentUser?.role);
  const isTourProfile = tourActive && tourStep === 2 && userId === tourPeerId;
  const [data, setData] = useState(userId === tourPeerId ? tourCandidate : location.state?.candidate || null);
  const [requestStatus, setRequestStatus] = useState(location.state?.candidate?.requestStatus || 'none');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (userId === tourPeerId) {
      setData(tourCandidate);
      return;
    }
    if (!data) {
      api.get(`/profiles/${userId}`).then(({ data }) => {
        setData({ ...data, compatibility: { score: 0, explanation: '' } });
        setRequestStatus(data.requestStatus || 'none');
      });
    }
  }, [tourCandidate, tourPeerId, userId]);

  function sendTourRequest() {
    showToast('Connection Request Sent');
    setTourStep(3);
    window.setTimeout(() => navigate('/matches'), 650);
  }

  async function connect() {
    if (!data?.user || ['pending', 'connected', 'self', 'unavailable'].includes(requestStatus)) return;
    setConnecting(true);
    try {
      await api.post('/matching/swipe', { targetUserId: data.user.id, action: 'connect' });
      setRequestStatus('pending');
      showToast('Request sent');
    } catch {
      showToast('Request could not be sent.', 'error');
    } finally {
      setConnecting(false);
    }
  }

  if (!data) return <AppShell><div className="ios-card p-6">Loading profile...</div></AppShell>;

  const { user, profile } = data;
  const skills = [...(profile.skills || []), ...(profile.industries || [])];
  const showConnectButton = !isTourProfile && !['self', 'unavailable'].includes(requestStatus);
  const connected = requestStatus === 'connected';
  const requested = requestStatus === 'pending';

  return (
    <AppShell>
      <Link to="/swipe" className="mb-4 inline-grid h-11 w-11 place-items-center rounded-full bg-white shadow-soft" aria-label="Back to swipe"><ChevronLeft /></Link>
      <section className="overflow-hidden rounded-[34px] bg-white shadow-soft">
        <div className="relative h-80">
          <Avatar name={user.name} src={profile.photo} className="h-full w-full text-7xl" rounded="rounded-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <h1 className="text-[32px] font-black leading-tight">{user.name}, {profile.age}</h1>
            <p className="mt-1 font-semibold">{profile.profession}</p>
          </div>
        </div>
        <div className="space-y-5 p-5">
          {isTourProfile && (
            <button
              onClick={sendTourRequest}
              data-tour="profile-connect"
              className="h-14 w-full rounded-full bg-brand-blue text-base font-black text-white shadow-soft"
            >
              Connect
            </button>
          )}
          {showConnectButton && (
            <button
              onClick={connect}
              disabled={connecting || requested || connected}
              className={`flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black shadow-soft ${
                connected
                  ? 'bg-brand-green text-white'
                  : requested
                    ? 'bg-brand-cream text-brand-muted'
                    : 'bg-brand-blue text-white'
              }`}
            >
              {connected ? <CheckCircle2 size={19} /> : <Send size={18} />}
              {connecting ? 'Sending...' : connected ? 'Connected' : requested ? 'Requested' : 'Connect'}
            </button>
          )}
          <Section title="About">
            <p className="leading-7 text-brand-muted">{profile.bio}</p>
          </Section>
          <div className="grid grid-cols-2 gap-3">
            <Stat icon={Briefcase} label="Experience" value={`${profile.yearsExperience || 0} years`} />
            <Stat icon={CalendarDays} label="Availability" value={(profile.availability || []).join(', ')} />
          </div>
          <Section title="Skills">
            <ChipList items={skills} />
          </Section>
          <Section title="Mentorship Topics">
            <ChipList items={profile.topics || []} />
          </Section>
          <Section title="Languages">
            <div className="flex items-center gap-2 text-brand-muted"><Languages size={18} /> {(profile.languages || []).join(', ')}</div>
          </Section>
          <Section title="Achievements">
            <div className="grid gap-2">
              {['Verified WeMentor profile', `${profile.yearsExperience || 0}+ years of practical experience`, `${profile.mentorshipStyle || 'Supportive'} mentorship style`].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-brand-cream p-3 text-sm font-bold"><Award size={18} className="text-brand-blue" /> {item}</div>
              ))}
            </div>
          </Section>
          <Section title="Reviews">
            <div className="rounded-[22px] bg-brand-cream p-4">
              <div className="flex text-brand-yellow"><Star fill="currentColor" /><Star fill="currentColor" /><Star fill="currentColor" /><Star fill="currentColor" /><Star fill="currentColor" /></div>
              <p className="mt-2 text-sm font-semibold text-brand-muted">WeMentor members describe this mentor as practical, patient, and easy to talk to.</p>
            </div>
          </Section>
          <Section title="Gallery">
            <div className="grid grid-cols-3 gap-2">
              {[profile.photo, profile.photo, profile.photo].filter(Boolean).map((photo, index) => <Avatar key={index} name={user.name} src={photo} className="aspect-square w-full text-2xl" rounded="rounded-2xl" />)}
            </div>
          </Section>
        </div>
      </section>
    </AppShell>
  );
}

function Section({ title, children }) {
  return <section><h2 className="mb-3 text-xl font-black">{title}</h2>{children}</section>;
}

function Stat({ icon: Icon, label, value }) {
  return <div className="rounded-[22px] bg-brand-cream p-4"><Icon className="mb-2 text-brand-blue" /><p className="text-xs font-black text-brand-muted">{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>;
}

function ChipList({ items }) {
  return <div className="flex flex-wrap gap-2">{items.map((item) => <span key={item} className="rounded-full bg-brand-cream px-3 py-2 text-sm font-black">{item}</span>)}</div>;
}
