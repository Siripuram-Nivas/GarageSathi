import express from 'express';
import cors from 'cors';
import { config } from './config';
import { router } from './routes';
import { errorHandler, notFound, requestId } from './middleware';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestId);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || !config.isProd || config.corsOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Origin not allowed by CORS'));
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id', 'X-AI-Mode', 'X-Audio-Mock'],
    }),
  );
  app.use(express.json({ limit: '120kb' }));

  app.use('/api', router);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
