import app from "./app";
import { connectDB } from "./config/database";
import { initEventBus } from "./events/eventBus";
import { initConsumers } from "./events/consumer";
import { config } from "./config";
import { EventBus } from '@streamia/shared';
import { RatingService } from './services/ratingService';

const start = async () => {
  await connectDB();
  await initEventBus();
  await initConsumers();

  // Initialize EventBus for Saga pattern
  const eventBus = new EventBus(config.rabbitmqUrl);
  await eventBus.connect();

  // Initialize RatingService with Saga handlers
  const ratingService = new RatingService();
  ratingService.initializeEventBus(eventBus);

  app.listen(config.port, () => {
    console.log(`⭐ Rating Service running on port ${config.port}`);
  });
};

start();