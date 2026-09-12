export function errorHandler(error, request, response, _next) {
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_ERROR';

  if (statusCode >= 500) {
    console.error(error);
  }

  response.status(statusCode).json({
    error: {
      code,
      message: statusCode >= 500 ? 'Error interno del servidor.' : error.message,
      requestId: request.id
    }
  });
}
