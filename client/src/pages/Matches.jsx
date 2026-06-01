import React from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import AppShell from '../components/AppShell';
import { api } from '../api/client';

export default function Matches() {
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    api.get('/matching/matches').then(({ data }) => setMatches(data.matches));
  }, []);

  return (
    <AppShell>
      <h1 className="text-3xl font-black">Matches</h1>
      <p className="mt-2 text-brand-muted">Only mutual learner and mentor matches can chat.</p>
      <div className="mt-6 grid gap-4">
        {matches.map((match) => (
          <Link key={match.id} to={`/messages/${match.id}`} className="flex items-center gap-4 rounded-[28px] bg-white/80 p-4 shadow">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-yellow text-xl font-black">{match.score}%</div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-black">{match.other?.name}</h2>
              <p className="line-clamp-2 text-sm text-brand-muted">{match.explanation}</p>
            </div>
            <MessageCircle className="text-brand-blue" />
          </Link>
        ))}
        {!matches.length && <div className="rounded-[28px] bg-white/80 p-6 text-center shadow">Your mutual matches will appear here.</div>}
      </div>
    </AppShell>
  );
}
