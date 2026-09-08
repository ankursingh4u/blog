import 'dotenv/config';
import { prisma } from '@/lib/db';

/**
 * Clears QUEUED keywords so a discovery run can be re-tested from clean.
 *
 * Deliberately leaves USED keywords alone: those are the dedupe record of what
 * has already been written about, and dropping them would let the pipeline
 * regenerate a post that already exists.
 */
async function main() {
  const { count } = await prisma.keyword.deleteMany({ where: { status: 'QUEUED' } });
  const used = await prisma.keyword.count({ where: { status: 'USED' } });
  console.log(`deleted ${count} queued keyword(s); kept ${used} used keyword(s)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
