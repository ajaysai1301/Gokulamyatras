/**
 * Controlled staff bootstrap for a new environment. Never runs in the web app.
 * Required environment: STAFF_EMAIL, STAFF_PASSWORD (12+ chars), STAFF_NAME,
 * STAFF_ROLE (ADMIN or COORDINATOR), DATABASE_URL.
 */
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { closeDb } from '../lib/db/mongo';
import { closePrisma } from '../lib/db/prisma';
import { getUserRepository } from '../lib/repositories/user.repository';
import { UserRole } from '../lib/domain/types';
import { hashPassword } from '../lib/auth/crypto';

const input = z.object({
  email: z.string().trim().max(254).email(),
  password: z.string().min(12).max(256),
  name: z.string().trim().min(2).max(120),
  role: z.enum(['ADMIN', 'COORDINATOR']),
}).parse({
  email: process.env.STAFF_EMAIL,
  password: process.env.STAFF_PASSWORD,
  name: process.env.STAFF_NAME,
  role: process.env.STAFF_ROLE,
});

async function main() {
  const repo = getUserRepository();
  const email = input.email.toLowerCase();
  if (await repo.findByEmail(email)) {
    throw new Error('A staff user with this email already exists');
  }
  const password = hashPassword(input.password);
  await repo.insertMany([{
    id: randomUUID(), email, name: input.name, role: input.role as UserRole, active: true,
    passwordHash: password.hash, passwordSalt: password.salt,
    createdAt: new Date().toISOString(),
  }]);
  console.log(`Created ${input.role} staff user ${email}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Staff creation failed');
  process.exitCode = 1;
}).finally(async()=>{await closeDb();await closePrisma();});
