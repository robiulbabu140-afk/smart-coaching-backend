import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as batchService from './batch.service';
import { ApiResponse } from '../../utils/apiResponse';

const createSchema = z.object({
  name: z.string().min(2),
  subject: z.string().optional(),
  teacherId: z.string().uuid().optional(),
  scheduleDays: z.array(z.string()).optional(),
  scheduleTime: z.string().optional(),
  maxStudents: z.number().int().min(1).max(7).optional(),
  minStudents: z.number().int().min(1).optional(),
});

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createSchema.parse(req.body);
    const batch = await batchService.createBatch((req as any).user.id, data);
    return ApiResponse.created(res, batch);
  } catch (e) { next(e); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const batches = await batchService.getBatches((req as any).user);
    return ApiResponse.success(res, batches);
  } catch (e) { next(e); }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const batch = await batchService.getBatchById(req.params.id, (req as any).user);
    return ApiResponse.success(res, batch);
  } catch (e) { next(e); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const batch = await batchService.updateBatch(req.params.id, req.body);
    return ApiResponse.success(res, batch);
  } catch (e) { next(e); }
}

export async function archive(req: Request, res: Response, next: NextFunction) {
  try {
    await batchService.archiveBatch(req.params.id);
    return ApiResponse.success(res, { message: 'ব্যাচ আর্কাইভ করা হয়েছে।' });
  } catch (e) { next(e); }
}

export async function addMember(req: Request, res: Response, next: NextFunction) {
  try {
    const { studentUserId } = z.object({ studentUserId: z.string().uuid() }).parse(req.body);
    const member = await batchService.addStudentToBatch(req.params.id, studentUserId);
    return ApiResponse.created(res, member);
  } catch (e) { next(e); }
}

export async function removeMember(req: Request, res: Response, next: NextFunction) {
  try {
    await batchService.removeStudentFromBatch(req.params.id, req.params.studentId);
    return ApiResponse.success(res, { message: 'স্টুডেন্ট ব্যাচ থেকে সরানো হয়েছে।' });
  } catch (e) { next(e); }
}

export async function assignTeacher(req: Request, res: Response, next: NextFunction) {
  try {
    const { teacherUserId } = z.object({ teacherUserId: z.string().uuid() }).parse(req.body);
    const batch = await batchService.assignTeacher(req.params.id, teacherUserId);
    return ApiResponse.success(res, batch);
  } catch (e) { next(e); }
}
