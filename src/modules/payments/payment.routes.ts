import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import * as svc from './payment.service';
import { ApiResponse } from '../../utils/apiResponse';

const r = Router();
r.use(authenticate);

r.post('/manual/submit', requireRole(['student']), async (req, res, next) => {
  try {
    const data = z.object({
      subscriptionId: z.string().uuid(),
      amountBdt: z.number().positive(),
      senderMsisdn: z.string().min(11),
      gatewayTxnId: z.string().optional(),
      manualProofUrl: z.string().url().optional(),
    }).parse(req.body);
    const payment = await svc.submitManualPayment((req as any).user.studentProfileId, data);
    return ApiResponse.created(res, payment);
  } catch (e) { next(e); }
});

r.get('/me', requireRole(['student']), async (req, res, next) => {
  try {
    return ApiResponse.success(res, await svc.getMyPayments((req as any).user.studentProfileId));
  } catch (e) { next(e); }
});

r.get('/admin/all', requireRole(['admin']), async (req, res, next) => {
  try {
    const { status } = req.query;
    return ApiResponse.success(res, await svc.getAllPayments(status as string));
  } catch (e) { next(e); }
});

r.post('/admin/:id/approve', requireRole(['admin']), async (req, res, next) => {
  try {
    const result = await svc.approvePayment(req.params.id, (req as any).user.id);
    return ApiResponse.success(res, result);
  } catch (e) { next(e); }
});

r.post('/admin/:id/reject', requireRole(['admin']), async (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = await svc.rejectPayment(req.params.id, (req as any).user.id, reason);
    return ApiResponse.success(res, result);
  } catch (e) { next(e); }
});

export default r;
