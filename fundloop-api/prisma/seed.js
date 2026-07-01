const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding FundLoop database...\n');

  // ── Users ──────────────────────────────────────────────────────────────────
  const hash = await bcrypt.hash('password123', 12);

  const chairman = await prisma.user.upsert({
    where: { email: 'chairman@fundloop.dev' },
    update: {},
    create: { fullName: 'James Kariuki', email: 'chairman@fundloop.dev', phone: '+254700000001', passwordHash: hash, isVerified: true },
  });

  const treasurer = await prisma.user.upsert({
    where: { email: 'treasurer@fundloop.dev' },
    update: {},
    create: { fullName: 'Grace Wanjiku', email: 'treasurer@fundloop.dev', phone: '+254700000002', passwordHash: hash, isVerified: true },
  });

  const member1 = await prisma.user.upsert({
    where: { email: 'member1@fundloop.dev' },
    update: {},
    create: { fullName: 'Peter Otieno', email: 'member1@fundloop.dev', phone: '+254700000003', passwordHash: hash, isVerified: true },
  });

  const member2 = await prisma.user.upsert({
    where: { email: 'member2@fundloop.dev' },
    update: {},
    create: { fullName: 'Mary Njoki', email: 'member2@fundloop.dev', phone: '+254700000004', passwordHash: hash, isVerified: true },
  });

  const member3 = await prisma.user.upsert({
    where: { email: 'member3@fundloop.dev' },
    update: {},
    create: { fullName: 'Samuel Mwangi', email: 'member3@fundloop.dev', phone: '+254700000005', passwordHash: hash, isVerified: true },
  });

  console.log('✓ Users created');

  // ── Chama ──────────────────────────────────────────────────────────────────
  const existingChama = await prisma.chama.findFirst({ where: { name: 'Umoja Savings Chama' } });

  const chama = existingChama || await prisma.chama.create({
    data: {
      name: 'Umoja Savings Chama',
      type: 'rosca_welfare',
      createdById: chairman.id,
      constitution: {
        rosca: {
          rotationMethod: 'fixed_order',
          missedPenaltyType: 'fine',
          fineAmount: 200,
        },
        welfare: {
          maxClaimPercentOfPool: 0.30,
          approvalThreshold: 0.70,
          allowedTypes: ['medical', 'funeral', 'disaster'],
        },
        governance: {
          simpleMajority: 0.501,
          constitutionalThreshold: 0.75,
          quorum: 0.60,
        },
        swap: {
          approvalThreshold: 0.667,
        },
      },
    },
  });

  console.log('✓ Chama created:', chama.name);

  // ── Memberships ────────────────────────────────────────────────────────────
  const membershipData = [
    { userId: chairman.id,  role: 'chairman',  status: 'active' },
    { userId: treasurer.id, role: 'treasurer', status: 'active' },
    { userId: member1.id,   role: 'member',    status: 'active' },
    { userId: member2.id,   role: 'member',    status: 'active' },
    { userId: member3.id,   role: 'member',    status: 'active' },
  ];

  for (const m of membershipData) {
    await prisma.membership.upsert({
      where: { userId_chamaId: { userId: m.userId, chamaId: chama.id } },
      update: {},
      create: { ...m, chamaId: chama.id, joinedAt: new Date() },
    });
  }

  console.log('✓ Memberships created (5 members)');

  // ── Wallets ────────────────────────────────────────────────────────────────
  // Chama wallets
  for (const wType of ['chama_rosca', 'chama_welfare', 'chama_general']) {
    await prisma.wallet.upsert({
      where: { ownerType_ownerId_chamaId: { ownerType: wType, ownerId: chama.id, chamaId: chama.id } },
      update: {},
      create: { ownerType: wType, ownerId: chama.id, chamaId: chama.id, balance: wType === 'chama_welfare' ? 50000n : 0n, currency: 'KES' },
    });
  }

  // Member wallets — seed with starting balance so contributions can be tested immediately
  for (const user of [chairman, treasurer, member1, member2, member3]) {
    await prisma.wallet.upsert({
      where: { ownerType_ownerId_chamaId: { ownerType: 'member', ownerId: user.id, chamaId: chama.id } },
      update: {},
      create: { ownerType: 'member', ownerId: user.id, chamaId: chama.id, balance: 10000n, currency: 'KES' },
    });
  }

  console.log('✓ Wallets created (welfare pool seeded at KES 50,000; each member wallet at KES 10,000)');

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n✅ Seed complete. Login credentials (all share password: password123):\n');
  console.log('  chairman@fundloop.dev   → role: chairman');
  console.log('  treasurer@fundloop.dev  → role: treasurer');
  console.log('  member1@fundloop.dev    → role: member  (Peter Otieno)');
  console.log('  member2@fundloop.dev    → role: member  (Mary Njoki)');
  console.log('  member3@fundloop.dev    → role: member  (Samuel Mwangi)');
  console.log('\n  Chama: Umoja Savings Chama');
  console.log('  Welfare pool: KES 50,000');
  console.log('  Each member wallet: KES 10,000\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
