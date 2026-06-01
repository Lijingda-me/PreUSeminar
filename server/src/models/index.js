import mongoose from 'mongoose';
import {
  EventSchema,
  GroupSchema,
  GroupMessageSchema,
  LearnerProfileSchema,
  AdminMessageSchema,
  MatchRequestSchema,
  MatchSchema,
  MentorProfileSchema,
  MessageSchema,
  GroupChatMessageSchema,
  GroupChatSchema,
  ReportSchema,
  UserSchema,
  UserSettingsSchema,
  WorkshopSchema
} from './schemas.js';

export const modelMap = {
  users: mongoose.models.User || mongoose.model('User', UserSchema),
  mentorProfiles: mongoose.models.MentorProfile || mongoose.model('MentorProfile', MentorProfileSchema),
  learnerProfiles: mongoose.models.LearnerProfile || mongoose.model('LearnerProfile', LearnerProfileSchema),
  matches: mongoose.models.Match || mongoose.model('Match', MatchSchema),
  matchRequests: mongoose.models.MatchRequest || mongoose.model('MatchRequest', MatchRequestSchema),
  messages: mongoose.models.Message || mongoose.model('Message', MessageSchema),
  groupChats: mongoose.models.GroupChat || mongoose.model('GroupChat', GroupChatSchema),
  groupChatMessages: mongoose.models.GroupChatMessage || mongoose.model('GroupChatMessage', GroupChatMessageSchema),
  reports: mongoose.models.Report || mongoose.model('Report', ReportSchema),
  adminMessages: mongoose.models.AdminMessage || mongoose.model('AdminMessage', AdminMessageSchema),
  workshops: mongoose.models.Workshop || mongoose.model('Workshop', WorkshopSchema),
  events: mongoose.models.Event || mongoose.model('Event', EventSchema),
  groups: mongoose.models.Group || mongoose.model('Group', GroupSchema),
  groupMessages: mongoose.models.GroupMessage || mongoose.model('GroupMessage', GroupMessageSchema),
  userSettings: mongoose.models.UserSettings || mongoose.model('UserSettings', UserSettingsSchema)
};
