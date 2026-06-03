import React from 'react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { availability, goals, industries, languages, personality, skills, styles, topics } from '../utils/options';

const learnerCards = [
  'Welcome',
  'Profile',
  'Interests',
  'Strengths',
  'Communication',
  'Goals'
];

export default function Onboarding() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const showToast = useToastStore((state) => state.showToast);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    photo: user.role === 'mentor' ? 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=900&q=80' : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80',
    age: user.role === 'mentor' ? 61 : 21,
    profession: '',
    yearsExperience: user.role === 'mentor' ? 25 : 1,
    industries: ['Finance'],
    skills: ['Leadership'],
    topics: ['Career guidance'],
    languages: ['English'],
    availability: ['Weekends'],
    mentorshipStyle: 'Structured',
    personality: ['Curious'],
    goals: ['Confidence'],
    bio: ''
  });

  const cards = learnerCards;
  const progress = useMemo(() => ((step + 1) / cards.length) * 100, [cards.length, step]);

  async function submit() {
    setSaving(true);
    try {
      const { data } = await api.post('/profiles/onboarding', form);
      setUser(data.user);
      showToast('Onboarding saved');
      navigate(data.user.role === 'admin' ? '/admin' : data.user.role === 'staff' ? '/staff' : '/swipe');
    } catch {
      showToast('Onboarding could not be saved.', 'error');
    } finally {
      setSaving(false);
    }
  }

  function next() {
    if (step < cards.length - 1) {
      setStep((value) => value + 1);
      return;
    }
    submit();
  }

  function previous() {
    setStep((value) => Math.max(0, value - 1));
  }

  if (['admin', 'staff'].includes(user.role)) {
    return (
      <AppShell hideBottomNav>
        <div className="rounded-[32px] bg-white/80 p-6 shadow-soft">
          <h1 className="text-3xl font-black">{user.role === 'admin' ? 'Admin ready' : 'Staff ready'}</h1>
          <p className="mt-2 text-brand-muted">{user.role === 'admin' ? 'Your admin account can verify users, moderate reports, and manage events from the admin dashboard.' : 'Your staff account can create schedules and manage BridgeUp events.'}</p>
          <Button className="mt-6 w-full" onClick={submit}>Enter BridgeUp</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell hideBottomNav>
      <div className="flex min-h-[calc(100vh-40px)] flex-col justify-center">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-brand-blue">BridgeUp setup</p>
          <h1 className="mt-1 text-[34px] font-black leading-tight">{user.role === 'mentor' ? 'Mentor onboarding' : 'Learner onboarding'}</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-brand-muted">A few quick cards power your compatibility score and match explanations.</p>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs font-black text-brand-muted">
              <span>{cards[step]}</span>
              <span>{step + 1} of {cards.length}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white shadow-inner">
              <div className="h-full rounded-full bg-brand-blue transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </header>

        <section className="sleek-scrollbar mt-5 max-h-[56vh] min-h-[420px] overflow-y-auto rounded-[32px] bg-white p-5 shadow-soft">
          {step === 0 && <WelcomeCard role={user.role} />}
          {step === 1 && (
            <div className="grid gap-4">
              <CardTitle title="Tell us about you" subtitle="This helps others understand your background before connecting." />
              <Field label="Profession" value={form.profession} onChange={(profession) => setForm({ ...form, profession })} placeholder={user.role === 'mentor' ? 'Retired HR Director' : 'Polytechnic Student'} />
              <Field label="Short bio" value={form.bio} onChange={(bio) => setForm({ ...form, bio })} placeholder="Share what kind of mentorship you hope to build." textarea />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Age" type="number" value={form.age} onChange={(age) => setForm({ ...form, age: Number(age) })} />
                <Field label="Years exp" type="number" value={form.yearsExperience} onChange={(yearsExperience) => setForm({ ...form, yearsExperience: Number(yearsExperience) })} />
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="grid gap-5">
              <CardTitle title="Choose your interests" subtitle="Pick the industries and topics that feel closest to what you want to explore." />
              <Picker label="Industries" options={industries} value={form.industries} onChange={(value) => setForm({ ...form, industries: value })} />
              <Picker label="Preferred topics" options={topics} value={form.topics} onChange={(value) => setForm({ ...form, topics: value })} />
            </div>
          )}
          {step === 3 && (
            <div className="grid gap-5">
              <CardTitle title="Add your strengths" subtitle="Skills and soft skills help BridgeUp explain why a match makes sense." />
              <Picker label="Skills" options={skills} value={form.skills} onChange={(value) => setForm({ ...form, skills: value })} />
            </div>
          )}
          {step === 4 && (
            <div className="grid gap-5">
              <CardTitle title="Language and personality" subtitle="Language, availability, and personality help people find the right rhythm with you." />
              <Picker label="Languages" options={languages} value={form.languages} onChange={(value) => setForm({ ...form, languages: value })} />
              <Picker label="Availability" options={availability} value={form.availability} onChange={(value) => setForm({ ...form, availability: value })} />
              <Picker label="Personality" options={personality} value={form.personality} onChange={(value) => setForm({ ...form, personality: value })} />
            </div>
          )}
          {step === 5 && (
            <div className="grid gap-5">
              <CardTitle title="What do you aim to achieve?" subtitle="Tell BridgeUp what you hope to get from this app so recommendations feel more personal." />
              <Picker label="Goals" options={goals} value={form.goals} onChange={(value) => setForm({ ...form, goals: value })} />
              <label className="block">
                <span className="text-sm font-bold text-brand-muted">Mentorship style</span>
                <select className="touch mt-2 w-full rounded-2xl border-0 bg-brand-cream px-4 outline-brand-blue" value={form.mentorshipStyle} onChange={(event) => setForm({ ...form, mentorshipStyle: event.target.value })}>
                  {styles.map((style) => <option key={style}>{style}</option>)}
                </select>
              </label>
            </div>
          )}
        </section>

        <footer className="-mx-5 mt-4 bg-brand-cream/95 px-5 pb-5 pt-3 backdrop-blur">
          <div className="grid grid-cols-[54px_1fr] gap-3">
            <button
              type="button"
              onClick={previous}
              disabled={step === 0 || saving}
              className="grid h-14 place-items-center rounded-full bg-white text-brand-muted shadow disabled:opacity-40"
              aria-label="Previous onboarding card"
            >
              <ArrowLeft size={20} />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={saving}
              className="flex h-14 items-center justify-center gap-2 rounded-full bg-brand-blue text-sm font-black text-white shadow-soft disabled:bg-brand-muted"
            >
              {step === cards.length - 1 ? <CheckCircle2 size={19} /> : <ArrowRight size={19} />}
              {saving ? 'Saving...' : step === cards.length - 1 ? 'Start matching' : 'Next'}
            </button>
          </div>
        </footer>
      </div>
    </AppShell>
  );
}

function WelcomeCard({ role }) {
  return (
    <div className="flex min-h-[420px] flex-col justify-center text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-[28px] bg-brand-blue text-white shadow-soft">
        <Sparkles size={34} />
      </div>
      <h2 className="mt-6 text-[30px] font-black leading-tight">Welcome to BridgeUp</h2>
      <p className="mx-auto mt-3 max-w-sm text-base font-semibold leading-7 text-brand-muted">
        BridgeUp helps {role === 'mentor' ? 'mentors find learners who can benefit from their guidance' : 'learners discover mentors, communities, and opportunities that match their goals'}.
      </p>
      <p className="mx-auto mt-4 max-w-sm rounded-[22px] bg-brand-blue/10 p-4 text-sm font-bold leading-6 text-brand-blue">
        Complete these short cards so your recommendations feel relevant from the start.
      </p>
    </div>
  );
}

function CardTitle({ title, subtitle }) {
  return (
    <div>
      <h2 className="text-[26px] font-black leading-tight">{title}</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-brand-muted">{subtitle}</p>
    </div>
  );
}

function Field({ label, value, onChange, textarea, ...props }) {
  const Component = textarea ? 'textarea' : 'input';
  return (
    <label className="block">
      <span className="text-sm font-bold text-brand-muted">{label}</span>
      <Component className="touch mt-2 w-full rounded-2xl border-0 bg-brand-cream px-4 py-3 outline-brand-blue" value={value} onChange={(event) => onChange(event.target.value)} required {...props} />
    </label>
  );
}

function Picker({ label, options, value, onChange }) {
  function toggle(option) {
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  }
  return (
    <div>
      <p className="text-sm font-bold text-brand-muted">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button type="button" key={option} onClick={() => toggle(option)} className={`rounded-full px-4 py-2 text-sm font-bold ${value.includes(option) ? 'bg-brand-blue text-white' : 'bg-brand-cream text-brand-muted'}`}>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
