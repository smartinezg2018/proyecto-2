import { AppError } from '../errors/AppError.js';

export function validateBody(schema) {
  return (request, _response, next) => {
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || 'La solicitud contiene datos inválidos.';
      next(new AppError(message, 400, 'VALIDATION_ERROR'));
      return;
    }

    request.body = parsed.data;
    next();
  };
}
