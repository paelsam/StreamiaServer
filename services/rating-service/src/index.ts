import app from "./app";
import { connectDB } from "./config/database";
import { initEventBus } from "./events/eventBus";
import { initConsumers } from "./events/consumer";
import { config } from "./config";

const start = async () => {
  await connectDB();
  await initEventBus();
  await initConsumers();

  app.listen(config.port, () => {
    console.log(`⭐ Rating Service running on port ${config.port}`);
  });
};

start();