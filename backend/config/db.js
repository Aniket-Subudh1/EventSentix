const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/event-sentiment-monitor';
    
    mongoose.set('strictQuery', false);

    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, 
      socketTimeoutMS: 45000, 
      maxPoolSize: 10,
      minPoolSize: 2
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Connection event listeners for better monitoring
    mongoose.connection.on('connected', () => {
      logger.info('Mongoose connected to database');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`Mongoose connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose disconnected from database');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('Mongoose connection closed through app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    
    if (process.env.NODE_ENV === 'production') {
      console.error('Critical: Unable to connect to MongoDB. Exiting...');
      process.exit(1);
    } else {
      logger.warn('Development mode: Continuing with mock database');
      return {
        connection: { 
          host: 'mock-database',
          on: () => {},
          once: () => {},
        }
      };
    }
  }
};

const checkDatabaseHealth = async () => {
  try {
    const db = mongoose.connection;
    await db.db.admin().ping();
    return {
      status: 'healthy',
      timestamp: new Date()
    };
  } catch (error) {
    logger.error('Database health check failed', { error });
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date()
    };
  }
};

module.exports = { 
  connectDB, 
  checkDatabaseHealth 
};
