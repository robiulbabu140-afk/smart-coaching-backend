import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { generalRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './modules/auth/auth.routes';
import batchRoutes from './modules/batches/batch.routes';
import classRoutes from './modules/classes/class.routes';
import subscriptionRoutes from './modules/subscriptions/subscription.routes';
import paymentRoutes from './modules/payments/payment.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import adminRoutes from './modules/admin/admin.routes';

const app = express();

app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3001',
    'https://smart-coaching-admin.onrender.com',
    env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(generalRateLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Temporary setup endpoint — creates first admin if none exists
app.post('/setup', async (_req, res) => {
  try {
    const { prisma } = await import('./config/database');
    const bcrypt = await import('bcryptjs');
    const existing = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (existing) {
      return res.json({ message: 'Admin already exists', phone: existing.phone });
    }
    const hash = await bcrypt.hash('admin1234', 12);
    const user = await prisma.user.create({
      data: {
        phone: '8801700000000',
        fullName: 'Super Admin',
        role: 'admin',
        status: 'active',
        passwordHash: hash,
        phoneVerified: true,
        adminProfile: { create: {} },
      },
    });
    return res.json({ message: 'Admin created!', phone: user.phone, password: 'admin1234' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

const api = '/v1';
app.use(`${api}/auth`, authRoutes);
app.use(`${api}/batches`, batchRoutes);
app.use(`${api}/classes`, classRoutes);
app.use(`${api}/subscriptions`, subscriptionRoutes);
app.use(`${api}/payments`, paymentRoutes);
app.use(`${api}/notifications`, notificationRoutes);
app.use(`${api}/admin`, adminRoutes);

app.use(errorHandler);

export default app;
