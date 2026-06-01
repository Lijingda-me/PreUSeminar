import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase() {
  if (!env.mongodbUri) {
    console.log('BridgeUp API using local JSON persistence. Set MONGODB_URI to use MongoDB.');
    return;
  }

  await mongoose.connect(env.mongodbUri);
  console.log('BridgeUp API connected to MongoDB.');
}
