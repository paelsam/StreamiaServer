import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import { config } from './config';
import favoritesRoutes from './routes/favoritesRoutes';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "http://localhost:*", "https://streamia-client2.vercel.app"]
    }
  }
}));

// CORS configuration
const corsOptions = {
  origin: config.corsOrigin.split(',').map(origin => origin.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health checks (sin autenticación)
app.get('/health', (_req, res) => {
  res.status(200).json({ 
    status: 'ok',
    service: config.serviceName,
    timestamp: new Date().toISOString()
  });
});

app.get('/health/live', (_req, res) => {
  res.status(200).json({ 
    status: 'live',
    service: config.serviceName,
    timestamp: new Date().toISOString()
  });
});

app.get('/health/ready', async (_req, res) => {
  try {
    const status = {
      service: config.serviceName,
      timestamp: new Date().toISOString(),
      dependencies: {
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      }
    };
    
    if (mongoose.connection.readyState === 1) {
      res.status(200).json({ 
        status: 'ready',
        ...status
      });
    } else {
      res.status(503).json({ 
        status: 'not ready',
        ...status
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(503).json({ 
      status: 'not ready',
      error: errorMessage,
      service: config.serviceName
    });
  }
});

// API Routes
app.use('/api/favorites', favoritesRoutes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    service: config.serviceName,
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api/favorites'
    }
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
});

// Error handler global
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Global error handler:', error);
  
  const status = error.status || 500;
  const message = error.message || 'Internal Server Error';
  
  res.status(status).json({
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message,
      ...(config.nodeEnv === 'development' && { 
        stack: error.stack,
        details: error.details 
      })
    }
  });
});

export { app };