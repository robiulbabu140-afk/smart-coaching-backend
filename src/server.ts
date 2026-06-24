import { env } from './config/env';
import { logger } from './utils/logger';
import { redis } from './config/redis';
import { prisma } from './config/database';
import app from './app';

async function bootstrap() {
  try {
    if (redis) {
      try { await redis.connect(); } catch { logger.warn('Redis not available, continuing without it'); }
    }

    if (process.env.DATABASE_URL) {
      await prisma.$connect();
      logger.info('Database connected');
      // Push schema to database on startup
      try {
        const { execSync } = require('child_process');
        execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
        logger.info('Database schema synced');
      } catch (e) {
        logger.warn('Schema sync warning (may already be up to date)');
      }
    } else {
      logger.warn('DATABASE_URL not set — database features disabled');
    }

    const port = env.PORT || 3000;
    app.listen(port, '0.0.0.0', () => {
      logger.info(`Server running on port ${port}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
    });
  } catch (err) {
    logger.error('Bootstrap failed:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  if (process.env.DATABASE_URL) await prisma.$disconnect();
  if (redis) await redis.quit();
  process.exit(0);
});

bootstrap();
