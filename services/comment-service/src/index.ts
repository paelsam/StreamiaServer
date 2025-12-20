import path from 'path';

// Load environment variables from infrastructure/.env FIRST
require('dotenv').config({
  path: path.resolve(__dirname, '../../../infrastructure/.env'),
  override: true,
});

import { createApp } from './app';
import { connectDB, config } from './config';
import { EventBus } from '@streamia/shared';
import { CommentService } from './services/commentService';

const app = createApp();
const PORT = config.port;

async function startServer() {
  try {
    console.log('🔧 [INDEX] Starting server...');
    console.log(`🔧 [INDEX] MongoDB URI: ${config.mongoUri.substring(0, 50)}...`);
    
    // Connect to MongoDB
    await connectDB();

    // Initialize EventBus for Saga pattern
    const eventBus = new EventBus(config.rabbitmqUrl);
    await eventBus.connect();

    // Initialize CommentService with Saga handlers
    const commentService = new CommentService();
    commentService.initializeEventBus(eventBus);
    console.log('✅ [INDEX] CommentService initialized with Saga handlers');

    // Start the server
    app.listen(PORT, () => {
      console.log(`✅ Comment service listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start comment service:', error);
    process.exit(1);
  }
}

startServer();
