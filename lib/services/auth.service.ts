/** Staff authentication service (admin + coordinator). */
import { v4 as uuidv4 } from 'uuid';
import { getUserRepository } from '@/lib/repositories/user.repository';
import { hashPassword, verifyPassword, signToken, verifyToken, TokenPayload } from '@/lib/auth/crypto';
import { StaffUser, UserRole } from '@/lib/domain/types';

const SEED_USERS: Array<{ email: string; name: string; role: UserRole; password: string }> = [
  { email: 'admin@gokulamyatras.in', name: 'Gokulam Admin', role: UserRole.ADMIN, password: 'admin123' },
  { email: 'coordinator@gokulamyatras.in', name: 'Ground Coordinator', role: UserRole.COORDINATOR, password: 'coord123' },
];

export async function ensureSeededUsers(): Promise<void> {
  const repo = getUserRepository();
  if ((await repo.count()) > 0) return;
  const users: StaffUser[] = SEED_USERS.map((u) => {
    const { salt, hash } = hashPassword(u.password);
    return {
      id: uuidv4(),
      email: u.email.toLowerCase(),
      name: u.name,
      role: u.role,
      passwordSalt: salt,
      passwordHash: hash,
      active: true,
      createdAt: new Date().toISOString(),
    };
  });
  await repo.insertMany(users);
}

export interface LoginResult {
  token: string;
  role: UserRole;
  name: string;
  email: string;
}

export async function login(email: string, password: string): Promise<LoginResult | null> {
  await ensureSeededUsers();
  const repo = getUserRepository();
  const user = await repo.findByEmail(email.toLowerCase());
  if (!user || !user.active) return null;
  if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) return null;
  const token = signToken({ sub: user.id, role: user.role, name: user.name, email: user.email });
  return { token, role: user.role, name: user.name, email: user.email };
}

export function getStaffFromToken(token?: string | null): TokenPayload | null {
  return verifyToken(token);
}
