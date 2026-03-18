import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.__mongooseConnectPromise;

if (!cached) {
  cached = global.__mongooseConnectPromise = mongoose
    .connect(MONGODB_URI, {
      // modern mongoose doesn't use these options, but keep compatibility
    })
    .then(() => mongoose.connection);
}

export default async function dbConnect() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set');
  }
  return cached;
}

