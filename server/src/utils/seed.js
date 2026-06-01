import bcrypt from 'bcryptjs';
import { readDb, writeDb } from '../services/fileStore.js';
import { calculateCompatibility } from '../services/matchingService.js';

const passwordHash = await bcrypt.hash('BridgeUp123!', 10);

const users = [
  { id: 'learner-1', name: 'Aisha Tan', email: 'learner@bridgeup.sg', role: 'learner', onboarded: true, passwordHash, blockedUsers: [], savedProfiles: [], status: 'active' },
  { id: 'mentor-1', name: 'Mr Lim Wei Kiat', email: 'mentor@bridgeup.sg', role: 'mentor', onboarded: true, passwordHash, blockedUsers: [], savedProfiles: [], status: 'active' },
  { id: 'mentor-2', name: 'Mdm Siti Rahman', email: 'siti@bridgeup.sg', role: 'mentor', onboarded: true, passwordHash, blockedUsers: [], savedProfiles: [], status: 'active' },
  { id: 'mentor-3', name: 'Dr Priya Nair', email: 'priya@bridgeup.sg', role: 'mentor', onboarded: true, passwordHash, blockedUsers: [], savedProfiles: [], status: 'active' },
  { id: 'learner-2', name: 'Joshua Goh', email: 'joshua@bridgeup.sg', role: 'learner', onboarded: true, passwordHash, blockedUsers: [], savedProfiles: [], status: 'active' },
  { id: 'staff-1', name: 'BridgeUp Staff', email: 'staff@bridgeup.sg', role: 'staff', onboarded: true, passwordHash, blockedUsers: [], savedProfiles: [], status: 'active' },
  { id: 'admin-1', name: 'BridgeUp Admin', email: 'admin@bridgeup.sg', role: 'admin', onboarded: true, passwordHash, blockedUsers: [], savedProfiles: [], status: 'active' }
];

const learnerProfiles = [
  {
    id: 'lp-1',
    userId: 'learner-1',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80',
    age: 22,
    profession: 'Final-year Business Student',
    yearsExperience: 1,
    industries: ['Finance', 'Social Impact'],
    skills: ['Presentation', 'Research', 'Excel'],
    topics: ['Career guidance', 'Interview confidence', 'Finance'],
    languages: ['English', 'Mandarin'],
    availability: ['Weekends', 'Evenings'],
    mentorshipStyle: 'Structured',
    personality: ['Curious', 'Reflective'],
    goals: ['First job', 'Leadership'],
    bio: 'Looking for practical career wisdom and a kind mentor who understands Singapore workplaces.',
    verified: true
  },
  {
    id: 'lp-2',
    userId: 'learner-2',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80',
    age: 19,
    profession: 'ITE Digital Media Student',
    yearsExperience: 1,
    industries: ['Technology', 'Design'],
    skills: ['Video editing', 'UI design'],
    topics: ['Portfolio review', 'Networking', 'Technology'],
    languages: ['English', 'Malay'],
    availability: ['Weekends'],
    mentorshipStyle: 'Hands-on',
    personality: ['Creative', 'Energetic'],
    goals: ['Internship', 'Confidence'],
    bio: 'I want to learn from someone who has changed careers and can help me grow a portfolio.',
    verified: true
  }
];

const mentorProfiles = [
  {
    id: 'mp-1',
    userId: 'mentor-1',
    photo: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=900&q=80',
    age: 68,
    profession: 'Retired DBS Relationship Manager',
    yearsExperience: 42,
    industries: ['Finance', 'Banking', 'Social Impact'],
    skills: ['Leadership', 'Interview coaching', 'Financial planning'],
    topics: ['Career guidance', 'Finance', 'Workplace communication'],
    languages: ['English', 'Mandarin', 'Hokkien'],
    availability: ['Weekends', 'Evenings'],
    mentorshipStyle: 'Structured',
    personality: ['Patient', 'Practical'],
    goals: ['Give back', 'Youth confidence'],
    bio: 'I help young people understand banking careers, prepare for interviews, and build calm confidence.',
    verified: true
  },
  {
    id: 'mp-2',
    userId: 'mentor-2',
    photo: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=900&q=80',
    age: 63,
    profession: 'Former HR Director',
    yearsExperience: 35,
    industries: ['Healthcare', 'Human Resources', 'Education'],
    skills: ['People management', 'Resume review', 'Conflict resolution'],
    topics: ['Interview confidence', 'Leadership', 'Career transitions'],
    languages: ['English', 'Malay'],
    availability: ['Weekdays', 'Mornings'],
    mentorshipStyle: 'Conversational',
    personality: ['Warm', 'Direct'],
    goals: ['Community building', 'Career clarity'],
    bio: 'I enjoy helping learners find their voice, practise tough conversations, and plan realistic next steps.',
    verified: true
  },
  {
    id: 'mp-3',
    userId: 'mentor-3',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=80',
    age: 59,
    profession: 'Technology Founder and Advisor',
    yearsExperience: 30,
    industries: ['Technology', 'Startups', 'Design'],
    skills: ['Product strategy', 'Public speaking', 'Networking'],
    topics: ['Portfolio review', 'Technology', 'Entrepreneurship'],
    languages: ['English', 'Tamil'],
    availability: ['Weekends', 'Evenings'],
    mentorshipStyle: 'Hands-on',
    personality: ['Creative', 'Encouraging'],
    goals: ['Open doors', 'Practical skills'],
    bio: 'I mentor youths on tech portfolios, product thinking, internships, and building confidence through practice.',
    verified: true
  }
];

const matchSeed = calculateCompatibility(learnerProfiles[0], mentorProfiles[0]);
const now = new Date().toISOString();

const db = await readDb();
await writeDb({
  ...db,
  users: users.map((item) => ({ ...item, createdAt: now, updatedAt: now })),
  learnerProfiles: learnerProfiles.map((item) => ({ ...item, createdAt: now, updatedAt: now })),
  mentorProfiles: mentorProfiles.map((item) => ({ ...item, createdAt: now, updatedAt: now })),
  matches: [{ id: 'match-1', learnerId: 'learner-1', mentorId: 'mentor-1', status: 'matched', ...matchSeed, createdAt: now, updatedAt: now }],
  matchRequests: [{ id: 'req-1', fromUserId: 'learner-1', toUserId: 'mentor-1', action: 'connect', status: 'accepted', createdAt: now, updatedAt: now }],
  messages: [
    { id: 'msg-1', matchId: 'match-1', senderId: 'mentor-1', receiverId: 'learner-1', body: 'Welcome to BridgeUp, Aisha. Shall we plan a weekend chat?', readAt: null, createdAt: now, updatedAt: now }
  ],
  reports: [],
  workshops: [
    { id: 'workshop-1', hostId: 'mentor-1', title: 'Interview Confidence for First Jobs', description: 'A gentle practice circle for youths preparing for interviews.', date: '2026-06-14', location: 'National Library, Victoria Street', capacity: 20, attendees: [], createdAt: now, updatedAt: now },
    { id: 'workshop-2', hostId: 'mentor-3', title: 'Build a Portfolio That Opens Doors', description: 'Hands-on review for design and tech portfolios.', date: '2026-06-21', location: 'One Punggol', capacity: 16, attendees: [], createdAt: now, updatedAt: now }
  ],
  events: [
    { id: 'event-1', title: 'BridgeUp Community Tea', description: 'Meet mentors, learners, and retirees in a relaxed intergenerational session.', date: '2026-06-08', location: 'Tampines Regional Library', attendees: [], createdAt: now, updatedAt: now }
  ],
  groups: [
    { id: 'group-1', name: 'Finance Starters', topic: 'Finance', description: 'Career guidance, interview prep, and workplace stories from banking mentors.', members: ['learner-1'], createdAt: now, updatedAt: now },
    { id: 'group-2', name: 'Tech Portfolio Circle', topic: 'Technology', description: 'Feedback and encouragement for youth building digital portfolios.', members: [], createdAt: now, updatedAt: now }
  ],
  userSettings: users.map((user) => ({ id: `settings-${user.id}`, userId: user.id, largerText: false, reduceMotion: false, highContrast: false, language: 'English', notifications: true, createdAt: now, updatedAt: now }))
});

console.log('BridgeUp seed data ready.');
