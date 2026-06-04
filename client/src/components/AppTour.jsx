import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { TOUR_MATCH_ID, tourCandidateFor, tourPeerIdFor, useTourStore } from '../store/tourStore';

function stepsFor(role) {
  const peer = tourCandidateFor(role);
  const peerKind = role === 'mentor' ? 'learners' : 'mentors';
  const peerName = peer.user.name;
  return [
  {
    route: '/swipe',
    selector: '[data-tour="swipe-card"]',
    hintSelector: '[data-tour="swipe-card"]',
    title: 'Discover Opportunities',
    body: `BridgeUp recommends ${peerKind} based on your interests, goals, availability, and preferences. Swipe left to skip, swipe right to send a connection request, or view the full profile first.`,
    detail: "Compatibility Score shows how closely your goals align. Why You're Matched explains the shared interests behind each recommendation.",
    button: 'Hint'
  },
  {
    route: '/search',
    selector: '[data-tour="search-mock-card"]',
    hintSelector: '[data-tour="search-view-profile"]',
    placement: 'top',
    title: 'Explore Beyond Swiping',
    body: `Prefer searching instead? Search helps you find specific ${peerKind}, discover community groups, and browse workshops or events.`,
    detail: `Tap View Profile on ${peerName} to learn more before connecting.`,
    button: 'Hint'
  },
  {
    route: `/profiles/${peer.user.id}`,
    selector: '[data-tour="profile-connect"]',
    hintSelector: '[data-tour="profile-connect"]',
    title: 'Send a Connection Request',
    body: role === 'mentor'
      ? "Found a learner you'd like to guide? Send them a connection request. If they're interested too, you'll become a match and unlock messaging."
      : "Found someone you'd like to learn from? Send them a connection request. If they're interested too, you'll become a match and unlock messaging.",
    detail: `Tap Connect to send ${peerName} a temporary request for this tour.`,
    button: 'Hint'
  },
  {
    route: '/matches',
    selector: '[data-tour="match-card"]',
    hintSelector: '[data-tour="match-chat-button"]',
    title: "You've Matched",
    body: `When both you and ${role === 'mentor' ? 'a learner' : 'a mentor'} express interest, a match is created. Matched ${peerKind} appear here so you can start conversations.`,
    detail: 'Tap the chat button to begin the conversation.',
    button: 'Hint'
  },
  {
    route: `/messages/${TOUR_MATCH_ID}`,
    selector: '[data-tour="conversation-area"]',
    title: 'Start Meaningful Conversations',
    body: role === 'mentor'
      ? 'Use messaging to understand goals, offer advice, share experience, and build trust with learners. Mentorship begins with a conversation.'
      : 'Use messaging to ask questions, seek advice, discuss goals, and learn from experienced mentors. Mentorship begins with a conversation.',
    detail: "After this, you'll be ready to explore BridgeUp on your own.",
    button: 'Next'
  }
  ];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default function AppTour() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const navigate = useNavigate();
  const { active, step, phase, start, complete, setStep } = useTourStore();
  const [rect, setRect] = useState(null);
  const role = user?.role;
  const peerId = tourPeerIdFor(role);
  const steps = useMemo(() => stepsFor(role), [role]);

  useEffect(() => {
    if (['learner', 'mentor'].includes(user?.role) && user.onboarded) start(user.id);
  }, [start, user?.id, user?.onboarded, user?.role]);

  const current = useMemo(() => {
    if (phase === 'ready') {
      return {
        route: `/messages/${TOUR_MATCH_ID}`,
        selector: '[data-tour="bottom-nav"]',
        title: "You're Ready",
        body: role === 'mentor'
          ? 'Discover learners through swiping, find opportunities through search, connect with people who value your guidance, and grow through meaningful conversations.'
          : 'Discover mentors through swiping, find opportunities through search, connect with people who share your goals, and grow through meaningful conversations.',
        detail: '',
        button: 'Start Exploring'
      };
    }
    return steps[step] || steps[0];
  }, [phase, role, step, steps]);

  useEffect(() => {
    if (!active) return;
    if (location.pathname !== current.route) navigate(current.route, { replace: true, state: { onboardingTour: true } });
  }, [active, current.route, location.pathname, navigate]);

  useEffect(() => {
    if (!active) return undefined;
    function measure() {
      const target = document.querySelector(current.selector);
      if (!target) {
        setRect(null);
        return;
      }
      const box = target.getBoundingClientRect();
      setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
    }
    const id = window.setTimeout(measure, 160);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [active, current.selector, location.pathname]);

  if (!active || !['learner', 'mentor'].includes(user?.role)) return null;

  const spotlight = rect || {
    top: 130,
    left: Math.max(20, (window.innerWidth - 390) / 2),
    width: Math.min(390, window.innerWidth - 40),
    height: 360
  };
  const cardWidth = Math.min(360, window.innerWidth - 32);
  const cardLeft = clamp(spotlight.left + spotlight.width / 2 - cardWidth / 2, 16, window.innerWidth - cardWidth - 16);
  const cardHeight = Math.min(390, window.innerHeight - 32);
  const targetCenter = spotlight.top + spotlight.height / 2;
  const cardTop = current.placement === 'top'
    ? 16
    : targetCenter < window.innerHeight / 2
      ? window.innerHeight - cardHeight - 16
      : 16;
  const progress = phase === 'ready' ? 5 : step + 1;

  function cancelTour() {
    complete(user.id);
    if (step === 2) {
      navigate('/search');
      return;
    }
    if (step === 4 || phase === 'ready') {
      navigate('/messages');
      return;
    }
    navigate(current.route === `/profiles/${peerId}` ? '/search' : location.pathname);
  }

  function previous() {
    if (phase === 'ready') {
      setStep(4);
      return;
    }
    if (step <= 0) return;
    setStep(step - 1);
  }

  function showHint() {
    const target = document.querySelector(current.hintSelector || current.selector);
    if (!target?.animate) return;
    if (step === 0) {
      target.animate(
        [
          { transform: 'translateX(0) rotate(0deg)' },
          { transform: 'translateX(28px) rotate(2deg)' },
          { transform: 'translateX(-22px) rotate(-2deg)' },
          { transform: 'translateX(0) rotate(0deg)' }
        ],
        { duration: 850, easing: 'ease-in-out' }
      );
      return;
    }
    target.animate(
      [
        { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(47,107,255,0)' },
        { transform: 'scale(1.04)', boxShadow: '0 0 0 10px rgba(47,107,255,0.22)' },
        { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(47,107,255,0)' }
      ],
      { duration: 700, easing: 'ease-out' }
    );
  }

  function primaryAction() {
    if (phase === 'ready') {
      complete(user.id);
      navigate('/swipe');
      return;
    }
    if (step < 4) {
      showHint();
      return;
    }
    setStep(4, 'ready');
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute rounded-[30px] border border-white/45 bg-transparent shadow-[0_0_0_9999px_rgba(8,11,24,0.74)]"
          style={{
            top: spotlight.top - 8,
            left: spotlight.left - 8,
            width: spotlight.width + 16,
            height: spotlight.height + 16
          }}
        />
        <motion.section
          key={`${step}-${phase}`}
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          className="sleek-scrollbar pointer-events-auto fixed overflow-y-auto rounded-[28px] border border-white bg-white p-4 text-brand-text shadow-[0_24px_80px_rgba(0,0,0,0.36)]"
          style={{ top: cardTop, left: cardLeft, width: cardWidth, maxHeight: cardHeight }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((item) => (
                <span key={item} className={`h-2 w-8 rounded-full ${item <= progress ? 'bg-brand-blue' : 'bg-slate-200'}`} />
              ))}
            </div>
            <button onClick={cancelTour} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-brand-muted" aria-label="Skip tour">
              <X size={17} />
            </button>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-blue">Step {progress} of 5</p>
          <h2 className="mt-1 text-[24px] font-black leading-tight">{current.title}</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{current.body}</p>
          {current.detail && <p className="mt-3 rounded-[18px] bg-brand-blue/10 p-3 text-xs font-bold leading-5 text-brand-blue">{current.detail}</p>}
          {step === 0 && phase !== 'ready' && (
            <p className="mt-3 text-xs font-black text-brand-coral">Tap Hint to preview the gesture, then swipe the card yourself to continue.</p>
          )}
          <div className="mt-4 grid grid-cols-[48px_1fr] gap-2">
            <button
              onClick={previous}
              disabled={step === 0 && phase !== 'ready'}
              className="grid h-12 place-items-center rounded-full bg-slate-100 text-brand-muted disabled:opacity-40"
              aria-label="Previous tour step"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              onClick={primaryAction}
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-brand-blue text-sm font-black text-white"
            >
              {phase === 'ready' ? <Check size={18} /> : step < 4 ? <Sparkles size={18} /> : <ArrowRight size={18} />}
              {current.button}
            </button>
          </div>
          <button onClick={cancelTour} className="mt-3 h-10 w-full rounded-full text-xs font-black text-brand-muted">
            Skip Tour
          </button>
        </motion.section>
      </div>
    </AnimatePresence>
  );
}
