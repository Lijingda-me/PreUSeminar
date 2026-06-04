import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Award, Bell, Camera, CheckCircle2, Copy, Eye, HelpCircle, ImagePlus, Info, Languages, Lock, LogOut, MessageCircle, MoreHorizontal, Palette, Send, Share2, ShieldAlert, Sparkles, Trash2, UserRound, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import Avatar from '../components/Avatar';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useTourStore } from '../store/tourStore';

const tabs = ['About', 'Experience', 'Mentor', 'Activity', 'Settings'];

export default function Profile() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const showToast = useToastStore((state) => state.showToast);
  const restartTour = useTourStore((state) => state.restart);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [activeTab, setActiveTab] = useState('About');
  const [mode, setMode] = useState('preview');
  const [gallery, setGallery] = useState([]);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showContactSheet, setShowContactSheet] = useState(false);
  const [contactText, setContactText] = useState('');
  const [sendingContact, setSendingContact] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/profiles/me'), api.get('/safety/settings')]).then(([profileRes, settingsRes]) => {
      setProfile(profileRes.data.profile);
      setSettings(settingsRes.data.settings);
      const photo = profileRes.data.profile?.photo;
      setGallery([photo, photo, photo]);
    });
  }, []);

  const completion = useMemo(() => {
    if (!profile) return 35;
    const fields = ['photo', 'profession', 'bio', 'industries', 'skills', 'topics', 'languages', 'availability', 'mentorshipStyle'];
    const done = fields.filter((field) => Array.isArray(profile[field]) ? profile[field].length : Boolean(profile[field])).length;
    return Math.round((done / fields.length) * 100);
  }, [profile]);

  async function saveProfile() {
    const { data } = await api.patch('/profiles/me', profile);
    setProfile(data.profile);
    showToast('Profile saved');
  }

  async function toggleSetting(key) {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    await api.patch('/safety/settings', next);
    showToast(`${key.replace(/([A-Z])/g, ' $1')} updated`, 'info');
  }

  function updateImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setProfile({ ...profile, photo: url });
    setGallery((items) => [url, ...items.slice(1)]);
    showToast('Image ready to crop/save');
  }

  function addGalleryImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setGallery((items) => [URL.createObjectURL(file), ...items]);
    showToast('Gallery image added');
  }

  function confirmLogout() {
    logout();
    showToast('Logged out', 'info');
    setShowLogoutConfirm(false);
  }

  const shareUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/profiles/${user.id}`;

  async function copyShareLink() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('textarea');
        input.value = shareUrl;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      showToast('Profile link copied');
    } catch {
      showToast('Could not copy link. Select it manually.', 'error');
    }
  }

  function openShareSheet() {
    setShowShareSheet(true);
  }

  function startAppTour() {
    restartTour();
    showToast('App tour restarted', 'info');
    navigate('/swipe');
  }

  async function submitContact(event) {
    event.preventDefault();
    const details = contactText.trim();
    if (!details) {
      showToast('Tell us what you need help with.', 'error');
      return;
    }
    setSendingContact(true);
    try {
      await api.post('/safety/contact', { details });
      setContactText('');
      setShowContactSheet(false);
      showToast('Message sent to WeMentor support');
    } catch {
      showToast('Message could not be sent.', 'error');
    } finally {
      setSendingContact(false);
    }
  }

  if (!profile && !['admin', 'staff'].includes(user.role)) {
    return <AppShell><div className="ios-card p-6">Loading profile...</div></AppShell>;
  }

  const roleLabel = user.role === 'mentor' ? 'Verified Mentor' : user.role === 'learner' ? 'Learner' : user.role;
  const industry = profile?.industries?.[0] || 'WeMentor Community';
  const statLabels = user.role === 'mentor'
    ? [{ label: 'Mentees Guided', value: '12' }, { label: 'Sessions Hosted', value: '28' }, { label: 'Success Rate', value: '89%' }]
    : [{ label: 'Mentors Connected', value: '3' }, { label: 'Sessions Attended', value: '8' }, { label: 'Goals Completed', value: '5' }];

  return (
    <AppShell>
      <section className="overflow-hidden rounded-[34px] bg-white shadow-soft">
        <div className="relative h-40 bg-[url('https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute right-4 top-4 flex gap-2">
            <button onClick={copyShareLink} className="grid h-11 w-11 place-items-center rounded-full bg-white/90 text-brand-blue shadow-soft" aria-label="Copy profile link"><Share2 /></button>
            <button onClick={() => setShowMore((value) => !value)} className="grid h-11 w-11 place-items-center rounded-full bg-white/90 text-brand-blue shadow-soft" aria-label="More profile actions"><MoreHorizontal /></button>
          </div>

          {showMore && (
            <div
                className="
                  absolute
                  right-4
                  top-14
                  z-50
                  w-52
                  rounded-[24px]
                  bg-white/95
                  p-2
                  shadow-[0_20px_60px_rgba(0,0,0,0.18)]
                  backdrop-blur
                "
              >
              <button onClick={() => { setMode('preview'); setShowMore(false); }} className="flex h-11 w-full items-center gap-2 rounded-2xl px-3 text-sm font-black text-brand-text"><Eye size={17} /> Preview Profile</button>
              <button onClick={() => { setProfile({ ...profile, photo: '' }); setShowMore(false); }} className="flex h-11 w-full items-center gap-2 rounded-2xl px-3 text-sm font-black text-brand-coral"><X size={17} /> Remove Photo</button>
            </div>
          )}
        </div>

        <div className="relative px-5 pb-5 text-center">
          <div className="-mt-14 flex flex-col items-center">
            <Avatar name={user.name} src={profile?.photo} className="h-28 w-28 text-4xl" rounded="rounded-full border-4 border-white" />
            <h1 className="mt-3 max-w-full truncate text-3xl font-black">{user.name}</h1>
            <p className="mt-1 flex items-center justify-center gap-1 text-sm font-black text-brand-blue"><CheckCircle2 size={15} /> {roleLabel}</p>
            <p className="text-sm font-semibold text-brand-muted">{industry}</p>
          </div>

          <p className="mx-auto mt-4 max-w-sm text-[15px] font-semibold leading-6 text-brand-muted">{profile?.bio || 'Building meaningful mentorship connections on WeMentor.'}</p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {statLabels.map((item) => <Stat key={item.label} label={item.label} value={item.value} />)}
          </div>

          <div className="mt-4 grid grid-cols-[1fr_92px_64px] gap-2">
            <button onClick={() => setMode('edit')} className="h-12 rounded-full bg-brand-blue text-sm font-black text-white">Edit Profile</button>
            <button onClick={copyShareLink} className="h-12 rounded-full bg-brand-cream text-sm font-black text-brand-blue">Share</button>
            <button onClick={() => setShowMore((value) => !value)} className="grid h-12 place-items-center rounded-full bg-brand-cream text-brand-blue"><MoreHorizontal /></button>
          </div>

          {completion >= 100 ? (
            <p className="mt-4 inline-flex items-center gap-1 rounded-full bg-brand-green/15 px-3 py-2 text-xs font-black text-brand-green"><CheckCircle2 size={15} /> Profile Complete</p>
          ) : (
            <>
              <div className="mt-4 rounded-full bg-brand-cream p-1"><div className="h-2 rounded-full bg-brand-blue" style={{ width: `${completion}%` }} /></div>
              <p className="mt-1 text-xs font-bold text-brand-muted">{completion}% profile complete</p>
            </>
          )}
        </div>
      </section>

      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-black ${activeTab === tab ? 'bg-brand-blue text-white' : 'bg-white text-brand-muted shadow'}`}>
            {tab}
          </button>
        ))}
      </div>

      <section className="mt-4">
        {activeTab === 'About' && <AboutTab profile={profile} setProfile={setProfile} mode={mode} gallery={gallery} addGalleryImage={addGalleryImage} setGallery={setGallery} setFullscreenImage={setFullscreenImage} />}
        {activeTab === 'Experience' && <ExperienceTab profile={profile} setProfile={setProfile} mode={mode} />}
        {activeTab === 'Mentor' && <MentorshipTab profile={profile} setProfile={setProfile} mode={mode} />}
        {activeTab === 'Activity' && <ActivityTab user={user} />}
        {activeTab === 'Settings' && <SettingsTab settings={settings} toggleSetting={toggleSetting} onLogoutClick={() => setShowLogoutConfirm(true)} onStartTour={startAppTour} onContact={() => setShowContactSheet(true)} user={user} />}
      </section>

      {mode === 'edit' && profile && <Button className="mt-5 w-full" onClick={saveProfile}>Save profile changes</Button>}

      {fullscreenImage && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-5" onClick={() => setFullscreenImage(null)}>
          <img src={fullscreenImage} alt="" className="max-h-full rounded-[28px] object-contain" />
        </div>
      )}

      {showShareSheet && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-5 backdrop-blur-sm" onClick={() => setShowShareSheet(false)}>
          <section className="w-full rounded-[30px] bg-white p-5 shadow-soft" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-brand-blue">Share profile</p>
                <h2 className="mt-1 text-2xl font-black">Copy your link</h2>
              </div>
              <button onClick={() => setShowShareSheet(false)} className="grid h-10 w-10 place-items-center rounded-full bg-brand-cream text-brand-muted" aria-label="Close share link">
                <X size={18} />
              </button>
            </div>
            <button
              type="button"
              onClick={copyShareLink}
              className="mt-4 flex w-full items-center gap-2 rounded-[22px] bg-brand-cream p-2 text-left"
              aria-label="Copy profile link"
            >
              <span className="min-w-0 flex-1 truncate px-2 text-sm font-semibold text-brand-text">{shareUrl}</span>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-blue text-white">
                <Copy size={18} />
              </span>
            </button>
          </section>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[32px] bg-white p-6 text-center shadow-soft">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-coral/10 text-brand-coral">
              <LogOut size={30} />
            </div>
            <h2 className="mt-4 text-2xl font-black">Log out?</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-brand-muted">
              Are you sure you want to log out of your WeMentor account?
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="h-12 rounded-full bg-brand-cream text-sm font-black text-brand-text">
                Cancel
              </button>
              <button onClick={confirmLogout} className="h-12 rounded-full bg-brand-coral text-sm font-black text-white">
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {showContactSheet && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-5 backdrop-blur-sm" onClick={() => setShowContactSheet(false)}>
          <section className="mx-auto w-full max-w-md rounded-[30px] bg-white p-5 shadow-soft" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-brand-blue">WeMentor support</p>
                <h2 className="mt-1 text-2xl font-black">Contact Us</h2>
              </div>
              <button onClick={() => setShowContactSheet(false)} className="grid h-10 w-10 place-items-center rounded-full bg-brand-cream text-brand-muted" aria-label="Close contact form">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitContact} className="mt-4">
              <textarea
                className="min-h-36 w-full resize-none rounded-[22px] bg-brand-cream p-4 text-sm font-semibold leading-6 outline-brand-blue"
                placeholder="Tell us what happened or what you need help with..."
                value={contactText}
                onChange={(event) => setContactText(event.target.value)}
                maxLength={1200}
              />
              <div className="mt-2 flex items-center justify-between text-xs font-bold text-brand-muted">
                <span>Support will review your message in-app.</span>
                <span>{contactText.length}/1200</span>
              </div>
              <button
                disabled={sendingContact || !contactText.trim()}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-blue text-sm font-black text-white disabled:bg-brand-cream disabled:text-brand-muted"
              >
                <Send size={17} />
                {sendingContact ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function Stat({ label, value }) {
  return <div className="rounded-[20px] bg-brand-cream p-3 text-center"><p className="text-xl font-black">{value}</p><p className="text-[11px] font-bold text-brand-muted">{label}</p></div>;
}

function Card({ title, children }) {
  return <section className="mb-4 rounded-[28px] bg-white p-5 shadow-soft"><h2 className="mb-3 text-xl font-black">{title}</h2>{children}</section>;
}

function Field({ value, onChange, multiline = false, placeholder }) {
  if (multiline) return <textarea className="min-h-28 w-full rounded-2xl bg-brand-cream p-4 outline-brand-blue" value={value || ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />;
  return <input className="touch w-full rounded-2xl bg-brand-cream px-4 outline-brand-blue" value={value || ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />;
}

function AboutTab({ profile, setProfile, mode, gallery, addGalleryImage, setGallery, setFullscreenImage }) {
  return (
    <>
      <Card title="About">
        {mode === 'edit' ? <Field multiline value={profile?.bio} onChange={(bio) => setProfile({ ...profile, bio })} /> : <p className="leading-7 text-brand-muted">{profile?.bio}</p>}
      </Card>
      <Card title="Personal Details">
        <InfoRow icon={Languages} label="Languages" value={profile?.languages?.join(', ') || 'Not added'} />
        <InfoRow icon={Sparkles} label="Interests" value={profile?.goals?.join(', ') || 'Mentorship and growth'} />
        <InfoRow icon={Bell} label="Availability" value={profile?.availability?.join(', ') || 'Flexible'} />
        <InfoRow icon={UserRound} label="Communication Style" value={profile?.mentorshipStyle || 'Supportive'} />
      </Card>
      <Card title="Gallery">
        <div className="grid grid-cols-3 gap-2">
          {gallery.filter(Boolean).map((photo, index) => (
            <div key={`${photo}-${index}`} className="group relative">
              <button onClick={() => setFullscreenImage(photo)} className="block w-full"><img src={photo} alt="" className="aspect-square rounded-2xl object-cover" /></button>
              {mode === 'edit' && <button onClick={() => setGallery(gallery.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white"><Trash2 size={15} /></button>}
            </div>
          ))}
          {mode === 'edit' && <label className="grid aspect-square place-items-center rounded-2xl border-2 border-dashed border-brand-blue/30 bg-brand-blue/5 text-brand-blue"><ImagePlus /><input type="file" accept="image/*" className="hidden" onChange={addGalleryImage} /></label>}
        </div>
      </Card>
    </>
  );
}

function ExperienceTab({ profile, setProfile, mode }) {
  return (
    <>
      <Card title="Profession">{mode === 'edit' ? <Field value={profile?.profession} onChange={(profession) => setProfile({ ...profile, profession })} /> : <p className="font-semibold text-brand-muted">{profile?.profession}</p>}</Card>
      <Card title="Experience">
        <InfoRow icon={Award} label="Years of Experience" value={`${profile?.yearsExperience || 0} years`} />
        <InfoRow icon={Sparkles} label="Industries" value={profile?.industries?.join(', ') || 'Not added'} />
        <InfoRow icon={Award} label="Education" value="Professional learning and lived experience" />
        <InfoRow icon={CheckCircle2} label="Certifications" value={profile?.verified ? 'WeMentor verified' : 'Not verified yet'} />
      </Card>
    </>
  );
}

function MentorshipTab({ profile }) {
  return (
    <>
      <Card title="Skills Offered"><ChipList items={profile?.skills || []} /></Card>
      <Card title="Mentorship Topics"><ChipList items={profile?.topics || []} /></Card>
      <Card title="Session Preferences">
        <InfoRow icon={Sparkles} label="Style" value={profile?.mentorshipStyle || 'Supportive'} />
        <InfoRow icon={Bell} label="Availability" value={profile?.availability?.join(', ') || 'Flexible'} />
      </Card>
      <Card title="Workshop History"><p className="text-brand-muted">Interview Confidence, Portfolio Review, Community Tea</p></Card>
    </>
  );
}

function ActivityTab({ user }) {
  const stats = user.role === 'mentor'
    ? ['12 total mentees', '28 mentorship sessions', '6 workshops hosted', '4 community contributions']
    : ['3 recent matches', '4 workshops joined', '2 projects shared', '5 community contributions'];

  return (
    <Card title="Activity">
      {stats.map((item) => <div key={item} className="mb-2 rounded-2xl bg-brand-cream p-3 font-bold">{item}</div>)}
      <Card title="Achievements"><ChipList items={['WeMentor verified', 'Active member', 'Mentorship milestone']} /></Card>
    </Card>
  );
}

function SettingsTab({ settings, toggleSetting, onLogoutClick, onStartTour, onContact, user }) {
  return (
    <>
      <Card title="Accessibility & Notifications">
        {settings && ['largerText', 'reduceMotion', 'highContrast', 'notifications'].map((key) => (
          <button key={key} onClick={() => toggleSetting(key)} className="mb-2 flex w-full items-center justify-between rounded-2xl bg-brand-cream p-4 text-left font-bold">
            <span>{key.replace(/([A-Z])/g, ' $1')}</span>
            <span className={`h-8 w-14 rounded-full p-1 ${settings[key] ? 'bg-brand-green' : 'bg-brand-muted/25'}`}><span className={`block h-6 w-6 rounded-full bg-white transition ${settings[key] ? 'translate-x-6' : ''}`} /></span>
          </button>
        ))}
      </Card>

      <Card title="Privacy & Security">
        <InfoRow icon={Lock} label="Privacy" value="Profile visible to WeMentor members" />
        <InfoRow icon={ShieldAlert} label="Security" value="JWT protected account" />
        <InfoRow icon={Palette} label="Theme" value="Light mode" />
        <InfoRow icon={Languages} label="Language" value={settings?.language || 'English'} />
      </Card>

      <Card title="Help">
        <button onClick={onContact} className={`${['learner', 'mentor'].includes(user.role) ? 'mb-2' : ''} flex w-full items-center justify-between rounded-2xl bg-brand-cream p-4 text-left font-black text-brand-text`}>
          <span className="flex items-center gap-2"><MessageCircle size={18} className="text-brand-blue" /> Contact Us</span>
          <span className="rounded-full bg-white px-3 py-1 text-xs text-brand-blue">Message</span>
        </button>
        {['learner', 'mentor'].includes(user.role) && (
          <button onClick={onStartTour} className="flex w-full items-center justify-between rounded-2xl bg-brand-blue/10 p-4 text-left font-black text-brand-blue">
            <span className="flex items-center gap-2"><HelpCircle size={18} /> App Tour</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs">Restart</span>
          </button>
        )}
      </Card>

      {['admin', 'staff'].includes(user.role) && (
        <Card title={`${user.role === 'admin' ? 'Admin' : 'Staff'} Controls`}>
          <p className="text-brand-muted">Protected controls are available in your role-specific tab.</p>
        </Card>
      )}

      <Button variant="secondary" className="w-full" onClick={onLogoutClick}>
        <LogOut className="mr-2 inline" /> Log out
      </Button>
    </>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return <div className="mb-2 flex items-center gap-3 rounded-2xl bg-brand-cream p-3"><Icon className="text-brand-blue" size={18} /><div><p className="text-xs font-black text-brand-muted">{label}</p><p className="text-sm font-bold">{value}</p></div></div>;
}

function ChipList({ items }) {
  return <div className="flex flex-wrap gap-2">{(items.length ? items : ['Not added yet']).map((item) => <span key={item} className="rounded-full bg-brand-cream px-3 py-2 text-sm font-black">{item}</span>)}</div>;
}
