import { env } from './config/env';
import { logger } from './utils/logger';
import { redis } from './config/redis';
import { prisma } from './config/database';
import app from './app';

async function bootstrap() {
  try {
    await redis.connect();
    await prisma.$connect();
    logger.info('Database connected');

    app.listen(env.PORT, () => {
      logger.info(`Server running on http://localhost:${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
    });
  } catch (err) {
    logger.error('Bootstrap failed:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

bootstrap();
