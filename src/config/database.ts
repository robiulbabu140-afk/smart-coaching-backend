import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

if (!process.env.DATABASE_URL) {
  console.error('⚠️  DATABASE_URL not set — database features will fail');
}

const prisma = new PrismaClient({
  log: [
    { level: 'error', emit: 'stdout' },
  ],
});

prisma.$on('query', (e) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`Query: ${e.query} | Duration: ${e.duration}ms`);
  }
});

export { prisma };
