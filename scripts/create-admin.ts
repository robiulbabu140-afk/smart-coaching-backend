import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const phone = process.argv[2] || '8801700000000';
  const password = process.argv[3] || 'admin1234';
  const name = process.argv[4] || 'Super Admin';

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { phone },
    update: { passwordHash, role: 'admin', status: 'active', fullName: name },
    create: {
      phone,
      fullName: name,
      role: 'admin',
      status: 'active',
      passwordHash,
      phoneVerified: true,
      adminProfile: { create: { permissions: [] } },
    },
    include: { adminProfile: true },
  });

  console.log('\n✅ Admin তৈরি হয়েছে!');
  console.log(`   ফোন: ${user.phone}`);
  console.log(`   পাসওয়ার্ড: ${password}`);
  console.log(`   নাম: ${user.fullName}\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
