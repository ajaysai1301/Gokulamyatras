/** PostgreSQL adapter. It is deliberately separate from the domain and services. */
import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';

type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];
const context = new AsyncLocalStorage<TransactionClient>();
const state = globalThis as unknown as { gyPrisma?: PrismaClient };

export function usesPostgres(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPrisma(): PrismaClient {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for PostgreSQL persistence');
  if (!state.gyPrisma) state.gyPrisma = new PrismaClient();
  return state.gyPrisma;
}

/** Returns the current transaction client, or the root client outside a transaction. */
export function prismaDb(): TransactionClient | PrismaClient {
  return context.getStore() ?? getPrisma();
}

export async function prismaTransaction<T>(work: () => Promise<T>): Promise<T> {
  if (context.getStore()) return work();
  return getPrisma().$transaction((tx) => context.run(tx, work), {
    isolationLevel: 'Serializable',
    maxWait: 5_000,
    timeout: 15_000,
  });
}

export async function closePrisma(): Promise<void> {
  await state.gyPrisma?.$disconnect();
  state.gyPrisma = undefined;
}
