import { Router } from 'express';

export const administrationRoutes = Router();

administrationRoutes.get('/buildings', (request, response) => {
  response.json({
    data: [],
    meta: { requestId: request.id, page: 1, pageSize: 20 }
  });
});
