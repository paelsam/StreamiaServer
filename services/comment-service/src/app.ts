import express, { Application, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import commentRoutes from './routes/commentRoutes';

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    })
  );

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { success: false, error: 'Too many requests, please try again later' },
  });
  app.use(limiter);

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging
  if (config.nodeEnv !== 'test') {
    app.use(morgan('combined'));
  }

  // Health check endpoints
  app.get('/health', (_req, res: Response) => {
    res.json({ status: 'ok', service: 'comment-service' });
  });

  app.get('/health/live', (_req, res: Response) => {
    res.json({ status: 'live' });
  });

  app.get('/health/ready', (_req, res: Response) => {
    res.json({ status: 'ready' });
  });

  // Routes
  app.use('/comments', commentRoutes);

  // 404 handler
  app.use((_req, res: Response) => {
    res.status(404).json({ success: false, error: 'Not found' });
  });

  return app;
}
