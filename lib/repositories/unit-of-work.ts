/** Persistence-neutral transaction boundary; services do not import database drivers. */
import { transaction } from '@/lib/db/mongo';
import { prismaTransaction, usesPostgres } from '@/lib/db/prisma';
export interface UnitOfWork { run<T>(work:()=>Promise<T>):Promise<T> }
const mongoUnit: UnitOfWork = { run: transaction };
const postgresUnit: UnitOfWork = { run: prismaTransaction };
export function getUnitOfWork(): UnitOfWork { return usesPostgres() ? postgresUnit : mongoUnit; }
