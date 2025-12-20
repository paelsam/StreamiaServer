import mongoose from 'mongoose';
import { config } from './config';
import { connectDB } from './config/db';
import { EventBus } from '@streamia/shared';
import { getFavoritesService } from './services/favoritesService';
import { app } from './app';

let eventBus: EventBus;

const startServer = async () => {
  try {
    console.log(`🚀 Starting ${config.serviceName}...`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Port: ${config.port}`);
    
    // 1. Conectar a MongoDB
    console.log('📦 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ MongoDB connected successfully');
    
    // 2. Inicializar EventBus (RabbitMQ)
    console.log('🔌 Connecting to RabbitMQ...');
    eventBus = new EventBus({
      url: config.rabbitmqUrl,
      serviceName: config.serviceName
    });
    await eventBus.connect();
    console.log('✅ RabbitMQ connected successfully');
    
    // 3. Inicializar FavoritesService con EventBus
    console.log('🔄 Initializing Favorites Service...');
    getFavoritesService(eventBus); // Esto registra los event handlers
    console.log('✅ Favorites Service initialized');
    
    // 4. Iniciar servidor Express
    console.log('🌐 Starting Express server...');
    
    const server = app.listen(config.port, () => {
      console.log(`✅ ${config.serviceName} running on port ${config.port}`);
      console.log(`📊 Health check: http://localhost:${config.port}/health/ready`);
      console.log(`🔗 API Base: http://localhost:${config.port}/api/favorites`);
    });
    
    // 5. Manejo de shutdown graceful
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      
      // Cerrar servidor HTTP
      server.close(async () => {
        console.log('HTTP server closed');
        
        // Desconectar EventBus
        if (eventBus) {
          await eventBus.disconnect();
          console.log('EventBus disconnected');
        }
        
        // Desconectar MongoDB
        if (mongoose.connection.readyState === 1) {
          await mongoose.disconnect();
          console.log('MongoDB disconnected');
        }
        
        console.log('👋 Shutdown complete');
        process.exit(0);
      });
      
      // Timeout for force shutdown
      setTimeout(() => {
        console.error('⚠️ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };
    
    // Capturar señales de terminación
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Manejar errores no capturados
    process.on('uncaughtException', (error) => {
      console.error('⚠️ Uncaught Exception:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('UNHANDLED_REJECTION');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();