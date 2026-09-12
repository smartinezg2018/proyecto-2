import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorHandler } from './shared/middleware/errorHandler.js';
import { requestId } from './shared/middleware/requestId.js';
import { administrationRoutes } from './modules/administration/presentation/http/routes.js';
import { assetsRoutes } from './modules/assets/presentation/http/routes.js';

export const app = express();

app.use(cors({ origin: env.webOrigin, credentials: true }));
app.use(express.json());
app.use(requestId);

app.get('/health', (request, response) => {
  response.json({ data: { status: 'ok' }, meta: { requestId: request.id } });
});

app.use('/api/v1/administration', administrationRoutes);
app.use('/api/v1/assets', assetsRoutes);
app.use(errorHandler);
