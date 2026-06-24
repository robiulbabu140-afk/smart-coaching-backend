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
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(generalRateLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
