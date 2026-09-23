import mongoose from 'mongoose';
import { connectDB } from './database.js';
import Service from './models/Service.js';
import Barber from './models/Barber.js';
import config from './config/index.js';
import logger from './utils/logger.js';

async function seedDatabase() {
  await connectDB();

  try {
    logger.info('Clearing existing services and barbers...');
    await Service.deleteMany({});
    await Barber.deleteMany({});

    logger.info('Inserting initial services...');
    await Service.insertMany(config.initialServices);

    logger.info('Inserting initial barbers...');
    await Barber.insertMany(config.initialBarbers);

    logger.info('Database seeding completed successfully.');
  } catch (error) {
    logger.error('Error seeding database', { error: error.message });
  } finally {
    await mongoose.disconnect();
    logger.info('Database connection closed after seeding.');
  }
}

seedDatabase();
