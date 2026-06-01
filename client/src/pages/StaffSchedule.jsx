import React from 'react';
import { useEffect, useState } from 'react';
import { CalendarDays, Plus, Trash2 } from 'lucide-react';
import AppShell from '../components/AppShell';
import Button from '../components/Button';
import { api } from '../api/client';
import { useToastStore } from '../store/toastStore';

const emptyForm = {
  type: 'event',
  title: '',
  description: '',
  date: '',
  location: '',
  capacity: 20
};

export default function StaffSchedule() {
  const [schedule, setSchedule] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const showToast = useToastStore((state) => state.showToast);

  async function load() {
    const { data } = await api.get('/community/schedule');
    setSchedule(data.schedule);
  }

  useEffect(() => { load(); }, []);

  async function createItem(event) {
    event.preventDefault();
    const payload = {
      title: form.title,
      description: form.description,
      date: form.date,
      location: form.location,
      capacity: Number(form.capacity)
    };
    await api.post(form.type === 'workshop' ? '/community/workshops' : '/community/events', payload);
    setForm(emptyForm);
    showToast('Schedule item created');
    await load();
  }

  async function deleteItem(item) {
    await api.delete(item.type === 'workshop' ? `/community/workshops/${item.id}` : `/community/events/${item.id}`);
    showToast('Schedule item removed');
    await load();
  }

  return (
    <AppShell>
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="font-bold text-brand-muted">BridgeUp Staff</p>
          <h1 className="text-3xl font-black">Schedule</h1>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-yellow text-brand-text">
          <CalendarDays />
        </div>
      </header>
      <section className="rounded-[32px] bg-white/80 p-5 shadow-soft">
        <h2 className="flex items-center gap-2 text-xl font-black"><Plus size={21} /> Create schedule item</h2>
        <form onSubmit={createItem} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-brand-cream p-1">
            {['event', 'workshop'].map((type) => (
              <button type="button" key={type} onClick={() => { setForm({ ...form, type }); showToast(`${type} selected`, 'info'); }} className={`touch rounded-xl text-sm font-black capitalize ${form.type === type ? 'bg-brand-blue text-white shadow' : 'text-brand-muted'}`}>
                {type}
              </button>
            ))}
          </div>
          <Field label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} />
          <Field label="Description" value={form.description} onChange={(description) => setForm({ ...form, description })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" type="date" value={form.date} onChange={(date) => setForm({ ...form, date })} />
            <Field label="Capacity" type="number" value={form.capacity} onChange={(capacity) => setForm({ ...form, capacity })} />
          </div>
          <Field label="Location" value={form.location} onChange={(location) => setForm({ ...form, location })} />
          <Button className="w-full">Create</Button>
        </form>
      </section>

      <section className="mt-5 space-y-3">
        <h2 className="text-xl font-black">Current schedule</h2>
        {schedule.map((item) => (
          <article key={`${item.type}-${item.id}`} className="rounded-[28px] bg-white/80 p-4 shadow">
            <div className="flex items-start gap-3">
              <div className={`rounded-2xl px-3 py-2 text-xs font-black capitalize ${item.type === 'workshop' ? 'bg-brand-green text-white' : 'bg-brand-blue text-white'}`}>
                {item.type}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-black">{item.title}</h3>
                <p className="text-sm font-semibold text-brand-muted">{item.date} · {item.location}</p>
                <p className="mt-2 text-sm text-brand-muted">{item.description}</p>
              </div>
              <button aria-label={`Remove ${item.title}`} onClick={() => deleteItem(item)} className="touch rounded-2xl bg-brand-coral px-3 text-white shadow">
                <Trash2 size={20} />
              </button>
            </div>
          </article>
        ))}
        {!schedule.length && <div className="rounded-[28px] bg-white/80 p-6 text-center font-semibold text-brand-muted shadow">No schedule items yet.</div>}
      </section>
    </AppShell>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-brand-muted">{label}</span>
      <input className="touch mt-2 w-full rounded-2xl border-0 bg-brand-cream px-4 outline-brand-blue" type={type} value={value} onChange={(event) => onChange(event.target.value)} required />
    </label>
  );
}
