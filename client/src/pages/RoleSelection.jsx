import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, GraduationCap, Shield, UserRoundCheck } from 'lucide-react';
import Button from '../components/Button';

export default function RoleSelection() {
  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-8">
      <h1 className="text-4xl font-black">Choose your WeMentor role</h1>
      <div className="mt-8 grid gap-4">
        {[
          ['learner', GraduationCap, 'Find mentors and join workshops.'],
          ['mentor', UserRoundCheck, 'Guide learners and host sessions.'],
          ['staff', CalendarDays, 'Create schedules and manage events.'],
          ['admin', Shield, 'Verify users and moderate safety.']
        ].map(([role, Icon, text]) => (
          <Link key={role} to={`/signup?role=${role}`} className="rounded-[28px] bg-white/80 p-5 shadow">
            <Icon className="mb-4 text-brand-blue" size={34} />
            <h2 className="text-2xl font-black capitalize">{role}</h2>
            <p className="mt-1 text-brand-muted">{text}</p>
          </Link>
        ))}
      </div>
      <Link to="/signup"><Button className="mt-6 w-full">Continue</Button></Link>
    </main>
  );
}
