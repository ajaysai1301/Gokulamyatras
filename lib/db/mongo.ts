/**
 * MongoDB connection factory (Emergent preview persistence).
 * ---------------------------------------------------------------------------
 * This is the ONLY place that opens a Mongo connection. Repositories depend on
 * getDb(); nothing else in the app imports the mongodb driver directly. When
 * migrating to Postgres/Prisma, this file and the Mongo repositories are the
 * only pieces that need to be replaced.
 */
import { MongoClient, Db } from 'mongodb';

const globalForMongo = globalThis as unknown as {
  _gyMongoClient?: MongoClient;
  _gyMongoDb?: Db;
};

export async function getDb(): Promise<Db> {
  if (globalForMongo._gyMongoDb) return globalForMongo._gyMongoDb;

  const uri = process.env.MONGO_URL;
  if (!uri) throw new Error('MONGO_URL environment variable is not set');

  const client = globalForMongo._gyMongoClient ?? new MongoClient(uri);
  if (!globalForMongo._gyMongoClient) {
    await client.connect();
    globalForMongo._gyMongoClient = client;
  }

  const db = client.db(process.env.DB_NAME || 'gokulamyatras');
  globalForMongo._gyMongoDb = db;
  return db;
}

/** Central registry of collection names to avoid magic strings. */
export const Collections = {
  yatras: 'yatras',
  customers: 'customers',
  bookings: 'bookings',
  travellers: 'travellers',
  payments: 'payments',
  tickets: 'tickets',
  checkins: 'checkins',
  users: 'users',
  termsConsents: 'terms_consents',
  auditLogs: 'audit_logs',
  counters: 'counters',
} as const;
