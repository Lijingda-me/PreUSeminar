import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Heart, Info, MoreHorizontal, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import Avatar from './Avatar';

function matchTone(score) {
  if (score >= 90) return { label: 'Highly Compatible', className: 'bg-brand-green text-white' };
  if (score >= 75) return { label: 'Strong Match', className: 'bg-brand-blue text-white' };
  if (score >= 60) return { label: 'Good Potential', className: 'bg-brand-amber text-brand-text' };
  return { label: 'Possible Match', className: 'bg-slate-200 text-brand-muted' };
}

function matchReasons(profile, compatibility) {
  const text = compatibility.explanation || '';
  const options = [
    ...(profile.industries || []).slice(0, 2),
    ...(profile.languages || []).slice(0, 1),
    ...(profile.availability || []).slice(0, 1),
    ...(profile.topics || []).slice(0, 2)
  ];

  return Array.from(new Set(options))
    .slice(0, 4)
    .map((item) => text.toLowerCase().includes(item.toLowerCase()) ? item : item);
}

export default function ProfileCard({ candidate, onSwipe, onSave, onReport, draggable = true }) {
  const [showMore, setShowMore] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-180, 180], [-9, 9]);
  const scale = useTransform(x, [-180, 0, 180], [0.98, 1, 0.98]);

  const { user, profile, compatibility } = candidate;
  const tone = matchTone(compatibility.score);

  const chips = [
    ...(profile.industries || []),
    ...(profile.skills || []),
    ...(profile.languages || []),
    ...(profile.topics || [])
  ];

  const uniqueChips = Array.from(new Set(chips));
  const visibleChips = uniqueChips.slice(0, 5);
  const hiddenCount = Math.max(0, uniqueChips.length - visibleChips.length);

  function handleDragEnd(_, info) {
    if (!draggable) return;
    if (info.offset.x > 110) onSwipe('connect');
    if (info.offset.x < -110) onSwipe('skip');
  }

  return (
    <div className="relative">
      {draggable && (
        <div className="absolute inset-x-3 top-4 h-[72vh] rounded-[34px] bg-white/60 shadow-soft" />
      )}

      <motion.article
        drag={draggable ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        style={{ x, rotate, scale }}
        whileTap={draggable ? { scale: 0.985 } : undefined}
        className="relative h-[calc(100vh-180px)] min-h-[680px] max-h-[820px] overflow-hidden rounded-[34px] bg-white shadow-soft"
      >
        <Link to={`/profiles/${user.id}`} state={{ candidate }} className="block h-[62%]">
          <div className="relative h-full overflow-hidden bg-slate-100">
            <Avatar
              name={user.name}
              src={profile.photo}
              className="h-full w-full text-7xl"
              rounded="rounded-none"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/28 to-black/5" />

            <div className="absolute left-4 top-4 rounded-full border border-white/40 bg-white/20 px-3 py-2 text-white shadow-soft backdrop-blur-md">
              <p className="text-[11px] font-black">{tone.label}</p>
              <p className="text-2xl font-black leading-none">{compatibility.score}%</p>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <h2 className="text-[28px] font-black leading-tight">
                {user.name}, {profile.age}
              </h2>
              <p className="mt-1 text-sm font-semibold opacity-95">
                {profile.profession}
              </p>
            </div>
          </div>
        </Link>

        <div className="h-[38%] overflow-y-auto p-4 pb-24 no-scrollbar">
          <div className="space-y-3">
            <p className="line-clamp-2 text-[15px] font-semibold leading-6 text-brand-muted">
              {profile.bio}
            </p>

            <Link
              to={`/profiles/${user.id}`}
              state={{ candidate }}
              className="text-sm font-black text-brand-blue"
            >
              Read More
            </Link>

            <div className="rounded-[20px] bg-brand-cream p-3">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-brand-muted">
                Why You're Matched
              </p>

              <div className="grid grid-cols-2 gap-1">
                {matchReasons(profile, compatibility).map((reason) => (
                  <span key={reason} className="text-xs font-black text-brand-text">
                    ✓ {reason}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {visibleChips.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-brand-text shadow-[0_6px_16px_rgba(20,28,45,0.08)]"
                >
                  {item}
                </span>
              ))}

              {hiddenCount > 0 && (
                <Link
                  to={`/profiles/${user.id}`}
                  state={{ candidate }}
                  className="rounded-full bg-brand-blue/10 px-3 py-1.5 text-xs font-black text-brand-blue"
                >
                  +{hiddenCount} More
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-4 bottom-3 grid grid-cols-[64px_1fr_64px] gap-3">
          <button
            aria-label="Pass"
            onClick={() => onSwipe('skip')}
            className="pointer-events-auto grid h-16 place-items-center rounded-full bg-white text-brand-coral shadow-soft"
          >
            <X size={28} />
          </button>

          <Link
            to={`/profiles/${user.id}`}
            state={{ candidate }}
            className="pointer-events-auto flex h-16 items-center justify-center rounded-full bg-white text-sm font-black text-brand-blue shadow-soft"
          >
            <Info className="mr-2" size={20} />
            View Profile
          </Link>

          <button
            aria-label="Connect"
            onClick={() => onSwipe('connect')}
            className="pointer-events-auto grid h-16 place-items-center rounded-full bg-brand-blue text-white shadow-soft"
          >
            <Heart size={28} />
          </button>
        </div>
      </motion.article>

      <div className="absolute right-4 top-4">
        <button
          onClick={() => setShowMore((value) => !value)}
          className="grid h-11 w-11 place-items-center rounded-full bg-white/90 text-brand-text shadow-soft backdrop-blur"
          aria-label="More actions"
        >
          <MoreHorizontal />
        </button>

        {showMore && (
          <div className="absolute right-0 mt-2 w-40 rounded-[20px] bg-white/95 p-2 shadow-soft backdrop-blur">
            <button
              onClick={onSave}
              className="h-11 w-full rounded-2xl text-left text-sm font-black text-brand-text"
            >
              Save
            </button>

            <button
              onClick={onReport}
              className="h-11 w-full rounded-2xl text-left text-sm font-black text-brand-coral"
            >
              Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}