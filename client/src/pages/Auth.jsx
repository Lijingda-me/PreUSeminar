import React from 'react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/Button';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';

function homeFor(user) {
  if (!user.onboarded) return '/onboarding';
  if (user.role === 'staff') return '/staff';
  return user.role === 'admin' ? '/admin' : '/swipe';
}

export default function Auth({ mode }) {
  const isSignup = mode === 'signup';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register, loading, error } = useAuthStore();
  const showToast = useToastStore((state) => state.showToast);
  const initialRole = ['learner', 'mentor', 'staff', 'admin'].includes(searchParams.get('role')) ? searchParams.get('role') : 'learner';
  const [form, setForm] = useState({ name: '', email: isSignup ? '' : 'learner@bridgeup.sg', password: isSignup ? '' : 'BridgeUp123!', role: initialRole });

  async function submit(event) {
    event.preventDefault();
    const user = isSignup ? await register(form) : await login(form.email, form.password);
    showToast(isSignup ? 'Account created' : 'Logged in');
    navigate(homeFor(user));
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-8">
      <Link to="/landing" className="font-bold text-brand-muted">Back</Link>
      <div className="mt-10 rounded-[32px] bg-white/80 p-6 shadow-soft">
        <h1 className="text-4xl font-black">{isSignup ? 'Create account' : 'Welcome back'}</h1>
        <p className="mt-2 text-brand-muted">{isSignup ? 'Choose your role and start onboarding.' : 'Continue to your matches.'}</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {isSignup && <Input label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} />}
          <Input label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
          <Input label="Password" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
          {isSignup && (
            <div>
              <label className="text-sm font-bold text-brand-muted">Role</label>
              <select className="touch mt-2 w-full rounded-2xl border-0 bg-brand-card px-4" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                <option value="learner">Learner</option>
                <option value="mentor">Mentor</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}
          {error && <p className="rounded-2xl bg-brand-coral/15 p-3 text-sm font-bold text-brand-coral">{error}</p>}
          <Button className="w-full" disabled={loading}>{loading ? 'Please wait...' : isSignup ? 'Sign up' : 'Log in'}</Button>
        </form>
        <Link className="mt-5 block text-center font-bold text-brand-blue" to={isSignup ? '/login' : '/signup'}>
          {isSignup ? 'Log in instead' : 'Create a new account'}
        </Link>
      </div>
    </main>
  );
}

function Input({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="text-sm font-bold text-brand-muted">{label}</label>
      <input className="touch mt-2 w-full rounded-2xl border-0 bg-brand-card px-4 outline-brand-blue" type={type} value={value} onChange={(event) => onChange(event.target.value)} required />
    </div>
  );
}
