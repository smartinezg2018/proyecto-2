import crypto from 'node:crypto';

export function requestId(request, response, next) {
  request.id = request.headers['x-request-id'] || crypto.randomUUID();
  response.setHeader('x-request-id', request.id);
  next();
}
