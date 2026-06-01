import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShieldCheck, UsersRound } from 'lucide-react';
import Button from '../components/Button';

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
      <section className="flex flex-1 flex-col justify-end rounded-[36px] bg-[url('https://images.unsplash.com/photo-1516307365426-bea591f05011?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center p-5 shadow-soft">
        <div className="rounded-[28px] bg-brand-text/72 p-5 text-white backdrop-blur">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-2 text-sm font-bold"><Heart size={18} /> Mentorship matching</div>
          <h1 className="text-4xl font-black leading-tight">BridgeUp</h1>
          <p className="mt-3 text-base leading-relaxed text-white/90">Swipe, match, and chat with trusted mentors, retirees, and experienced professionals in Singapore.</p>
        </div>
      </section>
      <section className="grid gap-3 py-5">
        <div className="grid grid-cols-2 gap-3">  
          <div className="rounded-3xl bg-white/70 p-4 shadow"><UsersRound className="mb-2 text-brand-blue" /><b>Learners meet mentors</b></div>
          <div className="rounded-3xl bg-white/70 p-4 shadow"><ShieldCheck className="mb-2 text-brand-green" /><b>Safe mutual chats</b></div>
        </div>
        <Link to="/signup"><Button className="w-full">Get started</Button></Link>
        <Link to="/login"><Button variant="secondary" className="w-full">I already have an account</Button></Link>
      </section>
    </main>
  );
}
