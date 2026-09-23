import mongoose from 'mongoose';
import config from './config/index.js';
import logger from './utils/logger.js';

export async function connectDB() {
  try {
    const options = {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    };

    await mongoose.connect(config.mongoUri, options);
    logger.info('Connected to MongoDB database successfully.');

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection lost. Reconnecting...');
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error: error.message });
    process.exit(1);
  }
}
