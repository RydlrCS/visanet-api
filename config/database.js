const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async() => {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    };

    await mongoose.connect(process.env.MONGODB_URI, options);

    logger.info('MongoDB Connected Successfully');
    console.log('✅ Database connected');

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
