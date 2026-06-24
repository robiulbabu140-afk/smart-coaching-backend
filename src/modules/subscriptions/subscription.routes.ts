import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import { getPlans, getMySubscription, subscribe, getAllSubscriptions, createPlan } from './subscription.service';
import { ApiResponse } from '../../utils/apiResponse';
import { z } from 'zod';

const r = Router();
r.use(authenticate);

r.get('/plans', async (req, res, next) => {
  try { return ApiResponse.success(res, await getPlans()); } catch (e) { next(e); }
});

r.post('/plans', requireRole(['admin']), async (req, res, next) => {
  try {
    const data = z.object({ name: z.string(), priceBdt: z.number(), durationDays: z.number(), description: z.string().optional() }).parse(req.body);
    return ApiResponse.created(res, await createPlan(data));
  } catch (e) { next(e); }
});

r.get('/me', requireRole(['student']), async (req, res, next) => {
  try {
    const sub = await getMySubscription((req as any).user.studentProfileId);
    return ApiResponse.success(res, sub);
  } catch (e) { next(e); }
});

r.post('/subscribe', requireRole(['student']), async (req, res, next) => {
  try {
    const { planId } = z.object({ planId: z.string().uuid() }).parse(req.body);
    const sub = await subscribe((req as any).user.studentProfileId, planId);
    return ApiResponse.created(res, sub);
  } catch (e) { next(e); }
});

r.get('/admin/all', requireRole(['admin']), async (req, res, next) => {
  try { return ApiResponse.success(res, await getAllSubscriptions()); } catch (e) { next(e); }
});

export default r;
