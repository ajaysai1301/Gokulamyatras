/** Persistence-neutral transaction boundary; services do not import database drivers. */
import { transaction } from '@/lib/db/mongo';
export interface UnitOfWork { run<T>(work:()=>Promise<T>):Promise<T> }
const unit: UnitOfWork = { run: transaction };
export function getUnitOfWork(): UnitOfWork { return unit; }
