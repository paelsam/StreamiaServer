import { config } from './config';
import { EventBus, retry } from '@streamia/shared';
import { NotificationConsumer } from './consumers/notificationConsumer';
import { startHealthServer, setHealthy } from './app';

async function bootstrap(): Promise<void> {
  console.log(`[${config.serviceName}] Starting service...`);

  // Start health check server
  await startHealthServer();

  // Create event bus
  const eventBus = new EventBus({
    url: config.rabbitmqUrl,
    serviceName: config.serviceName,
  });

  try {
    // Connect to RabbitMQ with retry
    await retry(() => eventBus.connect(), {
      maxRetries: 5,
      delay: 2000,
      backoff: 2,
    });

    // Initialize notification consumer
    const notificationConsumer = new NotificationConsumer(eventBus);
    
    // Verify email service connection
    await notificationConsumer.verifyEmailService();
    
    // Start consuming events
    await notificationConsumer.initialize();

    // Mark service as healthy
    setHealthy(true);
    console.log(`[${config.serviceName}] Service ready and listening for events`);

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`[${config.serviceName}] Received ${signal}, shutting down gracefully...`);

      setHealthy(false);
      await eventBus.disconnect();
      console.log(`[${config.serviceName}] Service stopped`);
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error(`[${config.serviceName}] Failed to start service:`, error);
    setHealthy(false);
    process.exit(1);
  }
}

// Start the service
bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
