import React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { availability, goals, industries, languages, personality, skills, styles, topics } from '../utils/options';

export default function Onboarding() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const showToast = useToastStore((state) => state.showToast);
  const navigate = useNavigate();
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

  async function submit(event) {
    event.preventDefault();
    const { data } = await api.post('/profiles/onboarding', form);
    setUser(data.user);
    showToast('Onboarding saved');
    navigate(data.user.role === 'admin' ? '/admin' : data.user.role === 'staff' ? '/staff' : '/swipe');
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
      <h1 className="text-4xl font-black">{user.role === 'mentor' ? 'Mentor onboarding' : 'Learner onboarding'}</h1>
      <p className="mt-2 text-brand-muted">This powers your compatibility score and match explanations.</p>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <Field label="Profession" value={form.profession} onChange={(profession) => setForm({ ...form, profession })} placeholder={user.role === 'mentor' ? 'Retired HR Director' : 'Polytechnic Student'} />
        <Field label="Short bio" value={form.bio} onChange={(bio) => setForm({ ...form, bio })} placeholder="Share what kind of mentorship you hope to build." textarea />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age" type="number" value={form.age} onChange={(age) => setForm({ ...form, age: Number(age) })} />
          <Field label="Years exp" type="number" value={form.yearsExperience} onChange={(yearsExperience) => setForm({ ...form, yearsExperience: Number(yearsExperience) })} />
        </div>
        <Picker label="Industries" options={industries} value={form.industries} onChange={(value) => setForm({ ...form, industries: value })} />
        <Picker label="Skills" options={skills} value={form.skills} onChange={(value) => setForm({ ...form, skills: value })} />
        <Picker label="Topics" options={topics} value={form.topics} onChange={(value) => setForm({ ...form, topics: value })} />
        <Picker label="Languages" options={languages} value={form.languages} onChange={(value) => setForm({ ...form, languages: value })} />
        <Picker label="Availability" options={availability} value={form.availability} onChange={(value) => setForm({ ...form, availability: value })} />
        <Picker label="Personality" options={personality} value={form.personality} onChange={(value) => setForm({ ...form, personality: value })} />
        <Picker label="Goals" options={goals} value={form.goals} onChange={(value) => setForm({ ...form, goals: value })} />
        <label className="block">
          <span className="text-sm font-bold text-brand-muted">Mentorship style</span>
          <select className="touch mt-2 w-full rounded-2xl border-0 bg-white px-4" value={form.mentorshipStyle} onChange={(event) => setForm({ ...form, mentorshipStyle: event.target.value })}>
            {styles.map((style) => <option key={style}>{style}</option>)}
          </select>
        </label>
        <Button className="w-full">Start matching</Button>
      </form>
    </AppShell>
  );
}

function Field({ label, value, onChange, textarea, ...props }) {
  const Component = textarea ? 'textarea' : 'input';
  return (
    <label className="block">
      <span className="text-sm font-bold text-brand-muted">{label}</span>
      <Component className="touch mt-2 w-full rounded-2xl border-0 bg-white px-4 py-3 outline-brand-blue" value={value} onChange={(event) => onChange(event.target.value)} required {...props} />
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
            <button type="button" key={option} onClick={() => toggle(option)} className={`rounded-full px-4 py-2 text-sm font-bold ${value.includes(option) ? 'bg-brand-blue text-white' : 'bg-white text-brand-muted'}`}>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
