import 'dotenv/config';
import { createApp } from './app';
import { connectDB, config } from './config';

const app = createApp();
const PORT = config.port;

async function startServer() {
  try {
    console.log('🔧 [INDEX] Starting server...');
    console.log(`🔧 [INDEX] MongoDB URI: ${config.mongoUri.substring(0, 50)}...`);
    
    // Connect to MongoDB
    await connectDB();

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
