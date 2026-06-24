export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'তথ্য পাওয়া যায়নি।') {
    super('NOT_FOUND', message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'অনুমতি নেই।') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'এই কাজের অনুমতি আপনার নেই।') {
    super('FORBIDDEN', message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 422);
  }
}
