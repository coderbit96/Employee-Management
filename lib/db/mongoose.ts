import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cache = globalForMongoose.mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!globalForMongoose.mongooseCache) {
  globalForMongoose.mongooseCache = cache;
}

export async function connectToDatabase() {
  if (cache.conn) {
    return cache.conn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required.");
  }

  if (uri.includes("<db_password>") || uri.includes("<replace-db-password>")) {
    throw new Error("Replace the MongoDB password placeholder in .env.local.");
  }

  cache.promise ??= mongoose.connect(uri, {
    bufferCommands: false,
    family: 4,
    serverSelectionTimeoutMS: 10_000,
  });

  cache.conn = await cache.promise;
  return cache.conn;
}
