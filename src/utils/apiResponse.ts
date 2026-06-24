import { Response } from 'express';

export const ApiResponse = {
  success<T>(res: Response, data: T, statusCode = 200) {
    return res.status(statusCode).json({ success: true, data });
  },

  created<T>(res: Response, data: T) {
    return res.status(201).json({ success: true, data });
  },

  error(res: Response, code: string, message: string, statusCode = 400) {
    return res.status(statusCode).json({
      success: false,
      error: { code, message },
    });
  },

  unauthorized(res: Response, message = 'অনুমতি নেই। আবার লগইন করুন।') {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message },
    });
  },

  forbidden(res: Response, message = 'এই কাজের অনুমতি আপনার নেই।') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message },
    });
  },

  notFound(res: Response, message = 'তথ্য পাওয়া যায়নি।') {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message },
    });
  },
};
