import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import mongoose from 'mongoose';
import { modelMap } from '../models/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../../data');
const dataFile = path.join(dataDir, 'bridgeup.json');

const initialData = {
  users: [],
  mentorProfiles: [],
  learnerProfiles: [],
  matches: [],
  matchRequests: [],
  messages: [],
  groupChats: [],
  groupChatMessages: [],
  callSessions: [],
  reports: [],
  adminMessages: [],
  workshops: [],
  events: [],
  groups: [],
  groupMessages: [],
  userSettings: []
};

async function ensureFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify(initialData, null, 2));
  }
}

function usingMongo() {
  return mongoose.connection.readyState === 1;
}

function normalize(doc) {
  if (!doc) return null;
  const item = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = item;
  return { id: String(item.id || _id), ...rest };
}

export async function readDb() {
  await ensureFile();
  const db = JSON.parse(await fs.readFile(dataFile, 'utf8'));
  return { ...initialData, ...db };
}

export async function writeDb(db) {
  await ensureFile();
  await fs.writeFile(dataFile, JSON.stringify(db, null, 2));
}

export async function list(collection) {
  if (usingMongo()) {
    const docs = await modelMap[collection].find({}).lean();
    return docs.map(normalize);
  }
  const db = await readDb();
  return db[collection] || [];
}

export async function findOne(collection, predicate) {
  return (await list(collection)).find(predicate) || null;
}

export async function insert(collection, payload) {
  if (usingMongo()) {
    const doc = await modelMap[collection].create(payload);
    return normalize(doc);
  }
  const db = await readDb();
  const now = new Date().toISOString();
  const item = { id: uuid(), ...payload, createdAt: now, updatedAt: now };
  db[collection].push(item);
  await writeDb(db);
  return item;
}

export async function update(collection, id, patch) {
  if (usingMongo()) {
    const doc = await modelMap[collection].findByIdAndUpdate(id, patch, { new: true });
    return normalize(doc);
  }
  const db = await readDb();
  const index = db[collection].findIndex((item) => item.id === id);
  if (index === -1) return null;
  db[collection][index] = { ...db[collection][index], ...patch, updatedAt: new Date().toISOString() };
  await writeDb(db);
  return db[collection][index];
}

export async function remove(collection, id) {
  if (usingMongo()) {
    await modelMap[collection].findByIdAndDelete(id);
    return;
  }
  const db = await readDb();
  db[collection] = db[collection].filter((item) => item.id !== id);
  await writeDb(db);
}
