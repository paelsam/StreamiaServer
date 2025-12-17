import express, { Express, Request, Response } from 'express';
import { config } from './config';

let isHealthy = false;

export function createApp(): Express {
  const app = express();

  app.get('/health', (req: Request, res: Response) => {
    if (isHealthy) {
      res.status(200).json({ status: 'OK' });
    } else {
      res.status(503).json({ status: 'NOT_READY' });
    }
  });

  app.get('/health/live', (req: Request, res: Response) => {
    res.status(200).json({ status: 'alive' });
  });

  return app;
}

export function setHealthy(healthy: boolean): void {
  isHealthy = healthy;
}

export function startHealthServer(): Promise<void> {
  return new Promise((resolve) => {
    const app = createApp();
    const port = parseInt(config.port || '3006', 10);

    app.listen(port, '0.0.0.0', () => {
      console.log(`[Health Check] Server listening on port ${port}`);
      resolve();
    });
  });
}
