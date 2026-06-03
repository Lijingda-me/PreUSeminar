import { create } from 'zustand';

export const TOUR_MENTOR_ID = 'tour-sarah-tan';
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

export const tourMessages = [
  {
    id: 'tour-msg-sarah',
    senderId: TOUR_MENTOR_ID,
    body: 'Hi! Happy to connect :)',
    deliveredAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 60000).toISOString(),
    readAt: new Date().toISOString(),
    sender: tourMentor.user,
    senderProfile: tourMentor.profile
  },
  {
    id: 'tour-msg-you',
    senderId: 'current-user',
    body: 'Looking forward to learning from you!',
    deliveredAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    readAt: new Date().toISOString(),
    sender: null,
    senderProfile: null
  }
];

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
