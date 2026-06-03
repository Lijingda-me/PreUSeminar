import { create } from 'zustand';

export const TOUR_MENTOR_ID = 'tour-sarah-tan';
export const TOUR_LEARNER_ID = 'tour-peter-lee';
export const TOUR_MATCH_ID = 'tour-sarah-match';

export const tourMentor = {
  user: { id: TOUR_MENTOR_ID, name: 'Sarah Tan', role: 'mentor' },
  profile: {
    userId: TOUR_MENTOR_ID,
    name: 'Sarah Tan',
    age: 34,
    photo: '',
    profession: 'Career Coach',
    bio: 'Sarah helps learners turn interests into practical next steps, prepare for interviews, and build confidence through clear mentoring goals.',
    industries: ['Career Guidance', 'Leadership'],
    skills: ['Interview Preparation', 'Goal Setting', 'Networking'],
    topics: ['Career Planning', 'Confidence Building'],
    languages: ['English'],
    availability: ['Weekends'],
    yearsExperience: 9,
    mentorshipStyle: 'Practical and encouraging'
  },
  compatibility: {
    score: 95,
    explanation: 'You both care about career guidance, goal setting, and practical interview preparation.'
  },
  requestStatus: 'none',
  onboarding: true
};

export const tourLearner = {
  user: { id: TOUR_LEARNER_ID, name: 'Peter Lee', role: 'learner' },
  profile: {
    userId: TOUR_LEARNER_ID,
    name: 'Peter Lee',
    age: 18,
    photo: '',
    profession: 'Pre-university learner',
    bio: 'Peter is exploring career paths, preparing for interviews, and looking for practical guidance from experienced mentors.',
    industries: ['Technology', 'Career Guidance'],
    skills: ['Communication', 'Portfolio Building', 'Interview Practice'],
    topics: ['Career Planning', 'University Applications'],
    languages: ['English'],
    availability: ['Evenings'],
    yearsExperience: 0,
    mentorshipStyle: 'Curious and goal-oriented'
  },
  compatibility: {
    score: 95,
    explanation: 'You both align on career guidance, interview preparation, and practical learning goals.'
  },
  requestStatus: 'none',
  onboarding: true
};

export function tourCandidateFor(role) {
  return role === 'mentor' ? tourLearner : tourMentor;
}

export function tourPeerIdFor(role) {
  return tourCandidateFor(role).user.id;
}

export function tourMessagesFor(role) {
  const peer = tourCandidateFor(role);
  return [
  {
    id: 'tour-msg-peer',
    senderId: peer.user.id,
    body: role === 'mentor' ? 'Hi! Thanks for connecting with me :)' : 'Hi! Happy to connect :)',
    deliveredAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 60000).toISOString(),
    readAt: new Date().toISOString(),
    sender: peer.user,
    senderProfile: peer.profile
  },
  {
    id: 'tour-msg-you',
    senderId: 'current-user',
    body: role === 'mentor' ? 'Happy to help you think through your goals!' : 'Looking forward to learning from you!',
    deliveredAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    readAt: new Date().toISOString(),
    sender: null,
    senderProfile: null
  }
  ];
}

function keyFor(userId) {
  return `bridgeup_app_tour_complete_${userId}`;
}

export const useTourStore = create((set, get) => ({
  active: false,
  step: 0,
  phase: 'default',
  swipeTried: false,
  start(userId, restart = false) {
    if (!userId) return;
    if (!restart && localStorage.getItem(keyFor(userId)) === 'true') return;
    set({ active: true, step: 0, phase: 'default', swipeTried: false });
  },
  restart() {
    set({ active: true, step: 0, phase: 'default', swipeTried: false });
  },
  complete(userId) {
    if (userId) localStorage.setItem(keyFor(userId), 'true');
    set({ active: false, step: 0, phase: 'default', swipeTried: false });
  },
  skip(userId) {
    get().complete(userId);
  },
  setStep(step, phase = 'default') {
    set({ step, phase });
  },
  markSwipeTried() {
    set({ swipeTried: true });
  }
}));
