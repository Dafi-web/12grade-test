import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.__mongooseConnectPromise;

export default async function dbConnect() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set');
  }
  if (!cached) {
    cached = global.__mongooseConnectPromise = mongoose
      .connect(MONGODB_URI, {})
      .then(() => mongoose.connection);
  }
  return cached;
}

