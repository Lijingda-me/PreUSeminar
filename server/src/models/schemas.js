import mongoose from 'mongoose';

const profileBase = {
  userId: { type: String, required: true, index: true },
  photo: String,
  age: Number,
  profession: String,
  yearsExperience: Number,
  industries: [String],
  skills: [String],
  topics: [String],
  languages: [String],
  availability: [String],
  mentorshipStyle: String,
  personality: [String],
  goals: [String],
  bio: String,
  verified: { type: Boolean, default: false }
};

export const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  role: { type: String, enum: ['learner', 'mentor', 'admin', 'staff'], required: true },
  onboarded: { type: Boolean, default: false },
  blockedUsers: [String],
  savedProfiles: [String],
  status: { type: String, default: 'active' }
}, { timestamps: true });

export const MentorProfileSchema = new mongoose.Schema(profileBase, { timestamps: true });
export const LearnerProfileSchema = new mongoose.Schema(profileBase, { timestamps: true });

export const MatchSchema = new mongoose.Schema({
  learnerId: String,
  mentorId: String,
  score: Number,
  explanation: String,
  status: { type: String, enum: ['pending', 'matched', 'rejected'], default: 'pending' }
}, { timestamps: true });

export const MatchRequestSchema = new mongoose.Schema({
  fromUserId: String,
  toUserId: String,
  action: { type: String, enum: ['connect', 'skip', 'save'], required: true },
  status: { type: String, enum: ['pending', 'accepted', 'declined', 'rejected'], default: 'pending' },
  viewedAt: Date,
  resolvedAt: Date
}, { timestamps: true });

export const MessageSchema = new mongoose.Schema({
  matchId: String,
  senderId: String,
  receiverId: String,
  body: String,
  readAt: Date
}, { timestamps: true });

export const GroupChatSchema = new mongoose.Schema({
  name: String,
  about: String,
  ownerId: String,
  moderators: [String],
  participantIds: [String]
}, { timestamps: true });

export const GroupChatMessageSchema = new mongoose.Schema({
  groupChatId: String,
  senderId: String,
  body: String,
  readBy: [String]
}, { timestamps: true });

export const ReportSchema = new mongoose.Schema({
  reporterId: String,
  reportedUserId: String,
  targetType: { type: String, default: 'user' },
  targetId: String,
  reason: String,
  details: String,
  status: { type: String, default: 'open' }
}, { timestamps: true });

export const AdminMessageSchema = new mongoose.Schema({
  reportId: String,
  adminId: String,
  recipientId: String,
  body: String
}, { timestamps: true });

export const WorkshopSchema = new mongoose.Schema({
  hostId: String,
  title: String,
  description: String,
  date: String,
  location: String,
  capacity: Number,
  attendees: [String]
}, { timestamps: true });

export const EventSchema = new mongoose.Schema({
  createdBy: String,
  title: String,
  description: String,
  date: String,
  time: String,
  location: String,
  organizer: String,
  capacity: Number,
  attendees: [String]
}, { timestamps: true });

export const GroupSchema = new mongoose.Schema({
  name: String,
  topic: String,
  description: String,
  ownerId: String,
  moderators: [String],
  members: [String]
}, { timestamps: true });

export const GroupMessageSchema = new mongoose.Schema({
  groupId: String,
  senderId: String,
  body: String,
  edited: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  deletedBy: String,
  deletedNotice: String
}, { timestamps: true });

export const UserSettingsSchema = new mongoose.Schema({
  userId: String,
  largerText: { type: Boolean, default: false },
  reduceMotion: { type: Boolean, default: false },
  highContrast: { type: Boolean, default: false },
  language: { type: String, default: 'English' },
  notifications: { type: Boolean, default: true }
}, { timestamps: true });
