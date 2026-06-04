import React from 'react';
import { useEffect, useState } from 'react';
import { Ban, CalendarDays, Flag, MessageCircle, ShieldCheck, Trash2, UsersRound } from 'lucide-react';
import AppShell from '../components/AppShell';
import Avatar from '../components/Avatar';
import { api } from '../api/client';
import { useToastStore } from '../store/toastStore';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [reports, setReports] = useState([]);
  const [bans, setBans] = useState([]);
  const [tab, setTab] = useState('learners');
  const [messageText, setMessageText] = useState({});
  const [banReason, setBanReason] = useState({});
  const [banDuration, setBanDuration] = useState({});
  const [fullProfile, setFullProfile] = useState(null);
  const showToast = useToastStore((state) => state.showToast);

  async function load() {
    const [overviewRes, reportsRes, bansRes] = await Promise.all([
      api.get('/profiles/admin/overview'),
      api.get('/safety/admin/reports'),
      api.get('/safety/admin/bans')
    ]);
    setData(overviewRes.data);
    setReports(reportsRes.data.reports);
    setBans(bansRes.data.users || []);
  }

  useEffect(() => { load(); }, []);

  if (!data) {
    return (
      <AppShell>
        <div className="rounded-[32px] bg-white/80 p-6 text-center shadow-soft">
          <h1 className="text-3xl font-black">Admin</h1>
          <p className="mt-2 text-brand-muted">Loading WeMentor community overview...</p>
        </div>
      </AppShell>
    );
  }

  const currentPeople = tab === 'learners' ? data.learners : data.mentors;

  return (
    <AppShell>
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="font-bold text-brand-muted">WeMentor Admin</p>
          <h1 className="text-3xl font-black">Community overview</h1>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-blue text-white">
          <ShieldCheck />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <Metric label="Learners" value={data.counts.learners} icon={UsersRound} />
        <Metric label="Mentors" value={data.counts.mentors} icon={ShieldCheck} />
        <Metric label="Open reports" value={data.counts.reports} icon={Flag} tone="warning" />
        <Metric label="Banned" value={bans.length} icon={Ban} tone="warning" />
      </section>

      <section className="mt-5 rounded-[32px] bg-white/80 p-4 shadow-soft">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-brand-cream p-1">
          {['learners', 'mentors'].map((item) => (
            <button key={item} onClick={() => { setTab(item); showToast(`Viewing ${item}`, 'info'); }} className={`touch rounded-xl text-sm font-black capitalize ${tab === item ? 'bg-brand-blue text-white shadow' : 'text-brand-muted'}`}>
              {item}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {currentPeople.map((person) => (
            <article key={person.id} className="rounded-3xl bg-brand-card p-4">
              <div className="flex items-center gap-3">
                <Avatar name={person.name} src={person.profile?.photo} className="h-14 w-14" rounded="rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-black">{person.name}</h2>
                  <button onClick={() => api.get(`/profiles/admin/full/${person.id}`).then(({ data: profile }) => { setFullProfile(profile); showToast('Full profile opened', 'info'); })} className="truncate text-left text-sm font-semibold text-brand-blue">{person.profile?.profession || person.email}</button>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${person.onboarded ? 'bg-brand-green text-white' : 'bg-brand-amber text-white'}`}>
                  {person.onboarded ? 'Onboarded' : 'Pending'}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(person.profile?.industries || []).slice(0, 3).map((industry) => (
                  <span key={industry} className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-brand-text">{industry}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-5 grid gap-3">
        <Panel title="Open reports" empty="No open reports.">
          {reports.filter((report) => report.status === 'open').map((report) => (
            <article key={report.id} className="rounded-2xl bg-white/80 p-3 text-sm">
              <b>{report.targetType === 'group' ? `Group: ${report.group?.name}` : `User: ${report.reportedUser?.name || 'Unknown'}`}</b>
              <p className="text-brand-muted">{report.reason} · {report.details || 'No additional details provided.'}</p>
              <p className="mt-1 text-xs font-bold text-brand-muted">Reporter: {report.reporter?.name || 'Unknown'}</p>
              <div className="mt-3 grid gap-2">
                <input className="touch rounded-2xl bg-brand-cream px-3" placeholder="Message about this report" value={messageText[report.id] || ''} onChange={(event) => setMessageText({ ...messageText, [report.id]: event.target.value })} />
                <div className="flex flex-wrap gap-2">
                  {report.reporter && <button className="touch rounded-2xl bg-brand-blue px-3 font-bold text-white" onClick={() => api.post(`/safety/admin/reports/${report.id}/messages`, { recipientId: report.reporter.id, body: messageText[report.id] || 'WeMentor admin is reviewing your report.' }).then(() => { showToast('Message sent to reporter'); load(); })}><MessageCircle className="mr-1 inline" size={16} /> Reporter</button>}
                  {report.reportedUser && <button className="touch rounded-2xl bg-brand-blue px-3 font-bold text-white" onClick={() => api.post(`/safety/admin/reports/${report.id}/messages`, { recipientId: report.reportedUser.id, body: messageText[report.id] || 'WeMentor admin is contacting you about a report.' }).then(() => { showToast('Message sent to reported user'); load(); })}><MessageCircle className="mr-1 inline" size={16} /> Reported</button>}
                  {report.targetType === 'group' && report.group && <button className="touch rounded-2xl bg-brand-coral px-3 font-bold text-white" onClick={() => api.delete(`/community/groups/${report.group.id}`).then(() => { showToast('Group deleted'); load(); })}><Trash2 className="mr-1 inline" size={16} /> Delete group</button>}
                </div>
                {report.reportedUser && (
                  <div className="grid gap-2">
                    <input className="touch rounded-2xl bg-brand-cream px-3" placeholder="Ban reason" value={banReason[report.id] || ''} onChange={(event) => setBanReason({ ...banReason, [report.id]: event.target.value })} />
                    <select className="touch rounded-2xl bg-brand-cream px-3" value={banDuration[report.id] || 'permanent'} onChange={(event) => setBanDuration({ ...banDuration, [report.id]: event.target.value })}>
                      <option value="permanent">Permanent</option>
                      {[1, 3, 7, 14, 30, 90, 180, 365].map((days) => <option key={days} value={days}>{days} days</option>)}
                    </select>
                    <button className="touch rounded-2xl bg-brand-coral px-3 font-bold text-white" onClick={() => api.post(`/safety/admin/ban/${report.reportedUser.id}`, { reason: banReason[report.id] || report.reason, durationDays: banDuration[report.id] || 'permanent' }).then(() => { showToast('User banned'); load(); })}><Ban className="mr-1 inline" size={16} /> Ban reported user</button>
                  </div>
                )}
                <button className="touch rounded-2xl bg-white px-3 font-bold text-brand-muted" onClick={() => api.patch(`/safety/admin/reports/${report.id}`, { status: 'closed', resolution: 'Reviewed by admin' }).then(() => { showToast('Report closed'); load(); })}>Close report</button>
              </div>
            </article>
          ))}
        </Panel>
        <Panel title="Ban list" empty="No active bans.">
          {bans.map((user) => (
            <article key={user.id} className="rounded-2xl bg-white/80 p-3 text-sm">
              <b>{user.name}</b>
              <p className="text-brand-muted">{user.email}</p>
              <p className="mt-1 text-brand-muted">Reason: {user.banReason || 'No reason provided.'}</p>
              <p className="text-xs font-bold text-brand-muted">{user.banUntil ? `Until ${new Date(user.banUntil).toLocaleDateString('en-SG')}` : 'Permanent ban'}</p>
              <button className="touch mt-3 w-full rounded-2xl bg-brand-green px-3 font-bold text-white" onClick={() => api.post(`/safety/admin/unban/${user.id}`, { reason: 'Admin removed ban from ban list.' }).then(() => { showToast('User unbanned'); load(); })}>Unban user</button>
            </article>
          ))}
        </Panel>
        <Panel title="Workshops and events" empty="No workshops yet.">
          {[...data.workshops, ...data.events].map((event) => (
            <div key={event.id} className="rounded-2xl bg-white/80 p-3 text-sm">
              <b>{event.title}</b>
              <p className="text-brand-muted">{event.date} · {event.location}</p>
            </div>
          ))}
        </Panel>
        <Panel title="Groups" empty="No groups yet.">
          {data.groups.map((group) => (
            <div key={group.id} className="rounded-2xl bg-white/80 p-3 text-sm">
              <b>{group.name}</b>
              <p className="text-brand-muted">{group.topic} · {group.members?.length || 0} members</p>
            </div>
          ))}
        </Panel>
      </section>
      {fullProfile && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-brand-text/60 p-4 backdrop-blur">
          <section className="max-h-[86vh] w-full max-w-md overflow-auto rounded-[32px] bg-white p-5 shadow-soft">
            <h2 className="text-2xl font-black">{fullProfile.user.name}</h2>
            <p className="font-semibold text-brand-muted">{fullProfile.user.email} · {fullProfile.user.role} · {fullProfile.user.status}</p>
            {fullProfile.profile && (
              <div className="mt-4 space-y-2 text-sm">
                <p><b>Profession:</b> {fullProfile.profile.profession}</p>
                <p><b>Bio:</b> {fullProfile.profile.bio}</p>
                <p><b>Industries:</b> {fullProfile.profile.industries?.join(', ')}</p>
                <p><b>Topics:</b> {fullProfile.profile.topics?.join(', ')}</p>
              </div>
            )}
            <p className="mt-4 text-sm font-bold text-brand-muted">Related reports: {fullProfile.reports.length}</p>
            <button className="touch mt-4 w-full rounded-2xl bg-brand-blue font-black text-white" onClick={() => setFullProfile(null)}>Close</button>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function Metric({ label, value, icon: Icon, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-blue text-white',
    warning: 'bg-brand-amber text-white',
    success: 'bg-brand-green text-white'
  };
  return (
    <div className="rounded-[28px] bg-white/80 p-4 shadow">
      <div className={`mb-3 grid h-11 w-11 place-items-center rounded-2xl ${tones[tone]}`}>
        <Icon size={22} />
      </div>
      <p className="text-3xl font-black">{value}</p>
      <p className="text-sm font-bold text-brand-muted">{label}</p>
    </div>
  );
}

function Panel({ title, empty, children }) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <section className="rounded-[28px] bg-white/70 p-4 shadow">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-3 grid gap-2">
        {items.length ? items : <p className="text-sm font-semibold text-brand-muted">{empty}</p>}
      </div>
    </section>
  );
}
