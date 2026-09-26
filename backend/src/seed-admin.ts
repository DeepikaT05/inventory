// Run once to create the first super-admin account.
// Usage: npx tsx src/seed-admin.ts
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './db.js';

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@mandiledger.com';
  const password = process.env.ADMIN_PASSWORD ?? 'admin123';
  const name = process.env.ADMIN_NAME ?? 'Super Admin';

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.adminUser.create({ data: { email, passwordHash, name } });
  console.log(`? Admin created: ${admin.email} (password: ${password})`);
  console.log('??  Change the password after first login!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
