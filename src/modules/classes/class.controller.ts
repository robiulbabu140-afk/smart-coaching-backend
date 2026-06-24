import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as classService from './class.service';
import { ApiResponse } from '../../utils/apiResponse';

export async function start(req: Request, res: Response, next: NextFunction) {
  try {
    const { batchId } = z.object({ batchId: z.string().uuid() }).parse(req.body);
    const result = await classService.startClass((req as any).user.id, batchId);
    return ApiResponse.success(res, result);
  } catch (e) { next(e); }
}

export async function join(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    const result = await classService.joinClass(req.params.id, user.id, user.role, user.studentProfileId);
    return ApiResponse.success(res, result);
  } catch (e) { next(e); }
}

export async function end(req: Request, res: Response, next: NextFunction) {
  try {
    const cls = await classService.endClass(req.params.id, (req as any).user.id);
    return ApiResponse.success(res, cls);
  } catch (e) { next(e); }
}

export async function respond(req: Request, res: Response, next: NextFunction) {
  try {
    const { response } = z.object({ response: z.enum(['accepted', 'declined']) }).parse(req.body);
    const user = (req as any).user;
    await classService.respondToClass(req.params.id, user.studentProfileId, response);
    return ApiResponse.success(res, { message: 'রেসপন্স সেভ করা হয়েছে।' });
  } catch (e) { next(e); }
}

export async function history(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    const data = await classService.getClassHistory(user.id, user.role, user.teacherProfileId || user.studentProfileId);
    return ApiResponse.success(res, data);
  } catch (e) { next(e); }
}

export async function attendance(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await classService.getAttendance(req.params.id);
    return ApiResponse.success(res, data);
  } catch (e) { next(e); }
}
