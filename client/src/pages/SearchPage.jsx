import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, CalendarDays, CheckCircle2, Clock, Filter, Loader2, MapPin, Plus, Search, SlidersHorizontal, Star, UsersRound } from 'lucide-react';
import AppShell from '../components/AppShell';
import Avatar from '../components/Avatar';
import { api } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { tourMentor, useTourStore } from '../store/tourStore';

const popularSearches = ['Finance', 'Career Guidance', 'Leadership', 'Interview Preparation', 'Technology', 'Entrepreneurship'];
const filters = ['All', 'Mentors', 'Workshops', 'Groups', 'Events', 'Saved'];
const sortOptions = ['Most Relevant', 'Highest Match', 'Highest Rated', 'Most Active', 'Most Experienced', 'Newest', 'Most Recommended'];

function suggestionsFor(query) {
  if (!query.trim()) return [];
  const q = query.trim();
  return [q, `${q} Mentor`, `${q} Career Guidance`, `${q} Industry`, `${q} Skills`].slice(0, 5);
}

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [groups, setGroups] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventLoadingId, setEventLoadingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [sort, setSort] = useState('Most Relevant');
  const [recent, setRecent] = useState(() => JSON.parse(localStorage.getItem('bridgeup_recent_searches') || '[]'));
  const [savedIds, setSavedIds] = useState(() => JSON.parse(localStorage.getItem('bridgeup_saved_search_ids') || '[]'));
  const [advanced, setAdvanced] = useState({ industry: '', language: '', availability: '', style: '', minimumCompatibility: 0 });
  const [groupForm, setGroupForm] = useState({ name: '', topic: '', description: '' });
  const showToast = useToastStore((state) => state.showToast);
  const tourActive = useTourStore((state) => state.active);
  const tourStep = useTourStore((state) => state.step);
  const setTourStep = useTourStore((state) => state.setStep);
  const inSearchTour = tourActive && tourStep === 1;

  const suggestions = useMemo(() => suggestionsFor(q), [q]);

  async function load(searchTerm = q) {
    const sortMap = {
      'Most Relevant': 'relevant',
      'Highest Match': 'match',
      'Most Experienced': 'experienced',
      Newest: 'newest',
      'Highest Rated': 'rated',
      'Most Active': 'relevant',
      'Most Recommended': 'match'
    };
    try {
      setLoadError('');
      const [searchRes, groupsRes, workshopsRes] = await Promise.all([
        api.get('/matching/search', { params: { q: searchTerm, industry: advanced.industry, minimumCompatibility: advanced.minimumCompatibility, sort: sortMap[sort] } }),
        api.get('/community/groups'),
        api.get('/community/workshops')
      ]);
      setResults(searchRes.data.results || []);
      setGroups(groupsRes.data.groups || []);
      setWorkshops(workshopsRes.data.workshops || []);
      setEvents(workshopsRes.data.events || []);
      if (searchTerm.trim()) {
        const next = [searchTerm.trim(), ...recent.filter((item) => item !== searchTerm.trim())].slice(0, 5);
        setRecent(next);
        localStorage.setItem('bridgeup_recent_searches', JSON.stringify(next));
      }
    } catch {
      setLoadError('Search results could not load right now.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load('');
    const id = setInterval(() => load(q), 10000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const id = setTimeout(() => load(q), 220);
    return () => clearTimeout(id);
  }, [q, sort, advanced.minimumCompatibility, advanced.industry]);

  async function createGroup(event) {
    event.preventDefault();
    try {
      await api.post('/community/groups', groupForm);
      setGroupForm({ name: '', topic: '', description: '' });
      setShowGroupForm(false);
      await load(q);
      showToast('Group created');
    } catch {
      showToast('Group could not be created.', 'error');
    }
  }

  async function connect(candidate) {
    if (candidate.requestStatus === 'pending' || candidate.requestStatus === 'connected') return;
    try {
      await api.post('/matching/swipe', { targetUserId: candidate.user.id, action: 'connect' });
      setResults((items) => items.map((item) => item.user.id === candidate.user.id ? { ...item, requestStatus: 'pending' } : item));
      showToast('Request sent');
    } catch {
      showToast('Request could not be sent.', 'error');
    }
  }

  async function save(candidate) {
    try {
      await api.post(`/profiles/save/${candidate.user.id}`);
      const next = Array.from(new Set([...savedIds, candidate.user.id]));
      setSavedIds(next);
      localStorage.setItem('bridgeup_saved_search_ids', JSON.stringify(next));
      showToast('Saved mentor');
    } catch {
      showToast('Profile could not be saved.', 'error');
    }
  }

  async function toggleEvent(eventItem) {
    setEventLoadingId(eventItem.id);
    try {
      const action = eventItem.joined ? 'leave' : 'join';
      const { data } = await api.post(`/community/events/${eventItem.id}/${action}`);
      setEvents((items) => items.map((item) => item.id === eventItem.id ? data.event : item));
      showToast(action === 'join' ? 'Event joined' : 'Event left');
    } catch {
      showToast('Event update could not be completed.', 'error');
    } finally {
      setEventLoadingId('');
    }
  }

  const baseResults = activeFilter === 'Saved' ? results.filter((item) => savedIds.includes(item.user.id)) : results;
  const visibleResults = inSearchTour
    ? [tourMentor, ...baseResults.filter((item) => item.user.id !== tourMentor.user.id)]
    : baseResults;

  return (
    <AppShell>
      <div data-tour="search-page">
      <div className="sticky top-0 z-30 -mx-5 -mt-5 bg-brand-cream/95 px-5 pb-3 pt-5 backdrop-blur">
        <h1 className="text-3xl font-black">Search</h1>
        <div className="mt-4 flex gap-2 rounded-[24px] bg-white p-2 shadow-soft">
          <Search className="ml-2 mt-3 text-brand-muted" />
          <input className="touch min-w-0 flex-1 bg-transparent font-semibold outline-none" placeholder="Finance, English, interviews..." value={q} onChange={(event) => setQ(event.target.value)} />
          <button onClick={() => setShowFilters(true)} className="grid h-12 w-12 place-items-center rounded-full bg-brand-cream text-brand-text" aria-label="Filters"><SlidersHorizontal /></button>
        </div>
        {suggestions.length > 0 && (
          <div className="sleek-scrollbar-x mt-2 flex gap-2 overflow-x-auto pb-2">
            {suggestions.map((item) => <button key={item} onClick={() => setQ(item)} className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-black shadow">{item}</button>)}
          </div>
        )}
        <div className="sleek-scrollbar-x mt-3 flex gap-2 overflow-x-auto pb-2">
          {filters.map((item) => <button key={item} onClick={() => setActiveFilter(item)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-black ${activeFilter === item ? 'bg-brand-blue text-white' : 'bg-white text-brand-muted shadow'}`}>{item}</button>)}
        </div>
      </div>

      <section className="mt-4">
        <p className="mb-2 text-sm font-black text-brand-muted">Popular Searches</p>
        <div className="flex flex-wrap gap-2">
          {popularSearches.map((item) => <button key={item} onClick={() => setQ(item)} className="rounded-full bg-white px-3 py-2 text-xs font-black text-brand-text shadow">{item}</button>)}
        </div>
        {recent.length > 0 && (
          <>
            <p className="mb-2 mt-4 text-sm font-black text-brand-muted">Recent Searches</p>
            <div className="flex flex-wrap gap-2">
              {recent.map((item) => <button key={item} onClick={() => setQ(item)} className="rounded-full bg-brand-blue/10 px-3 py-2 text-xs font-black text-brand-blue">{item}</button>)}
            </div>
          </>
        )}
      </section>

      {loading && <div className="mt-5 rounded-[28px] bg-white p-6 text-center font-semibold text-brand-muted shadow-soft">Loading results...</div>}
      {loadError && !loading && (
        <div className="mt-5 rounded-[28px] bg-white p-6 text-center shadow-soft">
          <h2 className="text-xl font-black">Results unavailable</h2>
          <p className="mt-2 text-sm font-semibold text-brand-muted">{loadError}</p>
          <button onClick={() => { setLoading(true); load(q); }} className="mt-4 h-11 rounded-full bg-brand-blue px-5 text-sm font-black text-white">Try again</button>
        </div>
      )}

      {!loading && !loadError && (activeFilter === 'All' || activeFilter === 'Mentors' || activeFilter === 'Saved') && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black">{activeFilter === 'Saved' ? 'Saved mentors' : 'Mentors'}</h2>
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-full bg-white px-3 py-2 text-xs font-black shadow">
              {sortOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="grid gap-3">
            {visibleResults.map((candidate) => (
              <MentorResult
                key={candidate.user.id}
                candidate={candidate}
                saved={savedIds.includes(candidate.user.id)}
                onSave={() => save(candidate)}
                onConnect={() => connect(candidate)}
                onViewProfile={() => candidate.onboarding && setTourStep(2)}
              />
            ))}
            {!visibleResults.length && <EmptySearch onSearch={setQ} />}
          </div>
        </section>
      )}

      {!loading && !loadError && (activeFilter === 'All' || activeFilter === 'Groups') && (
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">Community groups</h2>
            <button onClick={() => setShowGroupForm((value) => !value)} className="grid h-12 w-12 place-items-center rounded-full bg-brand-blue text-white shadow-soft" aria-label="Add community group"><Plus /></button>
          </div>
          {showGroupForm && <form onSubmit={createGroup} className="mt-3 rounded-[28px] bg-white/80 p-4 shadow">
            <input className="touch mb-2 w-full rounded-2xl bg-brand-cream px-4 outline-brand-blue" placeholder="Group name" value={groupForm.name} onChange={(event) => setGroupForm({ ...groupForm, name: event.target.value })} required />
            <input className="touch mb-2 w-full rounded-2xl bg-brand-cream px-4 outline-brand-blue" placeholder="Topic" value={groupForm.topic} onChange={(event) => setGroupForm({ ...groupForm, topic: event.target.value })} required />
            <input className="touch mb-3 w-full rounded-2xl bg-brand-cream px-4 outline-brand-blue" placeholder="Description" value={groupForm.description} onChange={(event) => setGroupForm({ ...groupForm, description: event.target.value })} required />
            <button className="touch w-full rounded-2xl bg-brand-blue font-black text-white">Create group</button>
          </form>}
          <div className="mt-3 grid gap-3">
            {groups.map((group) => <Link key={group.id} to={`/groups/${group.id}`} className="rounded-3xl bg-white/80 p-4 text-left shadow"><b>{group.name}</b><p className="mt-1 line-clamp-2 text-sm text-brand-muted">{group.description}</p></Link>)}
          </div>
        </section>
      )}

      {!loading && !loadError && (activeFilter === 'All' || activeFilter === 'Workshops' || activeFilter === 'Events') && (
        <section className="mt-6">
          <h2 className="text-xl font-black">Workshops & Events</h2>
          <div className="mt-3 grid gap-3">
            {workshops.map((workshop) => <button key={workshop.id} onClick={() => api.post(`/community/workshops/${workshop.id}/attend`).then(() => showToast('Workshop joined')).catch(() => showToast('Workshop could not be joined.', 'error'))} className="rounded-3xl bg-brand-card p-4 text-left shadow"><b>{workshop.title}</b><p className="mt-1 text-sm text-brand-muted">{workshop.date} - {workshop.location}</p></button>)}
            {events.map((eventItem) => (
              <EventCard
                key={eventItem.id}
                eventItem={eventItem}
                loading={eventLoadingId === eventItem.id}
                onToggle={() => toggleEvent(eventItem)}
              />
            ))}
          </div>
        </section>
      )}

      {showFilters && <AdvancedFilters advanced={advanced} setAdvanced={setAdvanced} onClose={() => setShowFilters(false)} />}
      </div>
    </AppShell>
  );
}

function EventCard({ eventItem, loading, onToggle }) {
  return (
    <article className="rounded-[24px] bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase text-brand-blue">Event</p>
          <h3 className="mt-1 text-lg font-black">{eventItem.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-brand-muted">{eventItem.description}</p>
        </div>
        <button
          disabled={loading}
          onClick={onToggle}
          className={`h-11 shrink-0 rounded-full px-4 text-sm font-black text-white ${eventItem.joined ? 'bg-brand-coral' : 'bg-brand-blue'}`}
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : eventItem.joined ? 'Leave Event' : 'Join'}
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-brand-muted">
        <span className="flex items-center gap-1 rounded-2xl bg-brand-cream px-3 py-2"><CalendarDays size={14} /> {eventItem.date}</span>
        <span className="flex items-center gap-1 rounded-2xl bg-brand-cream px-3 py-2"><Clock size={14} /> {eventItem.time || 'TBA'}</span>
        <span className="flex items-center gap-1 rounded-2xl bg-brand-cream px-3 py-2"><MapPin size={14} /> {eventItem.location}</span>
        <span className="flex items-center gap-1 rounded-2xl bg-brand-cream px-3 py-2"><UsersRound size={14} /> {eventItem.participantCount || 0} joined</span>
      </div>
      <p className="mt-3 text-sm font-semibold text-brand-muted">Organizer: {eventItem.organizer || 'BridgeUp Staff'}</p>
    </article>
  );
}

function MentorResult({ candidate, saved, onSave, onConnect, onViewProfile }) {
  const { user, profile, compatibility } = candidate;
  const requested = candidate.requestStatus === 'pending';
  const connected = candidate.requestStatus === 'connected';
  return (
    <article className="rounded-[24px] bg-white p-3 shadow-soft">
      <div className="flex gap-3">
        <Avatar name={user.name} src={profile.photo} className="h-20 w-20 text-2xl" rounded="rounded-[20px]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-black">{user.name}</h3>
              <p className="flex items-center gap-1 text-xs font-black text-brand-blue"><CheckCircle2 size={13} /> Verified {user.role}</p>
            </div>
            <button onClick={onSave} className={`grid h-9 w-9 place-items-center rounded-full ${saved ? 'bg-brand-blue text-white' : 'bg-brand-cream text-brand-muted'}`} aria-label="Save mentor"><Bookmark size={17} /></button>
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-brand-muted">{profile.profession}</p>
          <div className="mt-2 flex items-center gap-3 text-xs font-black">
            <span className="flex items-center gap-1 text-brand-amber"><Star size={14} fill="currentColor" /> 4.9</span>
            <span className="text-brand-blue">{compatibility.score}% Match</span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-brand-muted">{profile.bio}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          to={`/profiles/${user.id}`}
          state={{ candidate, onboardingTour: candidate.onboarding }}
          onClick={onViewProfile}
          data-tour={candidate.onboarding ? 'search-view-profile' : undefined}
          className="grid h-11 place-items-center rounded-full bg-brand-cream text-sm font-black text-brand-blue"
        >
          View Profile
        </Link>
        <button
          onClick={onConnect}
          disabled={requested || connected}
          className={`h-11 rounded-full text-sm font-black ${requested || connected ? 'bg-brand-cream text-brand-muted' : 'bg-brand-blue text-white'}`}
        >
          {connected ? 'Connected' : requested ? 'Requested' : 'Connect'}
        </button>
      </div>
    </article>
  );
}

function EmptySearch({ onSearch }) {
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-soft">
      <h3 className="text-xl font-black">No exact matches yet</h3>
      <p className="mt-2 text-sm text-brand-muted">Try related industries, skills, or popular searches.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {popularSearches.slice(0, 4).map((item) => <button key={item} onClick={() => onSearch(item)} className="rounded-full bg-brand-cream px-3 py-2 text-xs font-black">{item}</button>)}
      </div>
    </div>
  );
}

function AdvancedFilters({ advanced, setAdvanced, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/30 px-5 py-6 backdrop-blur-sm">
      <section className="mx-auto max-w-md rounded-[30px] bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-black">Filters</h2>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-brand-cream"><Filter size={18} /></button>
        </div>
        <div className="grid gap-3">
          {['industry', 'language', 'availability', 'style'].map((field) => <input key={field} className="touch rounded-2xl bg-brand-cream px-4 outline-brand-blue" placeholder={field[0].toUpperCase() + field.slice(1)} value={advanced[field]} onChange={(event) => setAdvanced({ ...advanced, [field]: event.target.value })} />)}
          <label className="rounded-2xl bg-brand-cream p-4 text-sm font-black">Minimum Compatibility: {advanced.minimumCompatibility}%<input type="range" min="0" max="100" value={advanced.minimumCompatibility} onChange={(event) => setAdvanced({ ...advanced, minimumCompatibility: event.target.value })} className="mt-2 w-full" /></label>
          <div className="grid grid-cols-2 gap-2 text-sm font-black">
            <span className="rounded-2xl bg-brand-cream p-3">Rating: 4★+</span>
            <span className="rounded-2xl bg-brand-cream p-3">Verified only</span>
          </div>
        </div>
        <button onClick={onClose} className="mt-4 h-12 w-full rounded-full bg-brand-blue font-black text-white">Apply filters</button>
      </section>
    </div>
  );
}
