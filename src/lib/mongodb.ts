import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI!;

if (!uri) {
  throw new Error('MONGO_URI environment variable is not defined');
}

let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  // In development, reuse the connection across HMR reloads via a global variable.
  // Without this, each hot-reload would create a new client and leak connections.
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri).connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, a module-level promise is safe — each serverless instance
  // initialises exactly once and reuses the connection for its lifetime.
  clientPromise = new MongoClient(uri).connect();
}

export default clientPromise;
