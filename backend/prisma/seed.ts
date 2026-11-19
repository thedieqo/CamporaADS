import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = process.env.DEMO_PASSWORD;
  if (!password) throw new Error('Configura DEMO_PASSWORD');
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email: 'productor@campora.demo' },
    update: { passwordHash, role: Role.PRODUCER, fullName: 'Productor Demo Tolima', municipality: 'Ibagué' },
    create: {
      email: 'productor@campora.demo',
      passwordHash,
      fullName: 'Productor Demo Tolima',
      role: Role.PRODUCER,
      municipality: 'Ibagué',
    },
  });
  console.log('Seed listo: productor@campora.demo');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
