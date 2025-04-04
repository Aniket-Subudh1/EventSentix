const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

// Import dependencies
const { connectDB } = require('./config/db');  
const logger = require('./utils/logger');
const feedQueue = require('./services/realtime/feedQueue');
const alertBroadcaster = require('./services/realtime/alertBroadcaster');

// Ensure logs directory exists
if (!fs.existsSync(path.join(__dirname, 'logs'))) {
  try {
    fs.mkdirSync(path.join(__dirname, 'logs'));
    console.log('Created logs directory');
  } catch (error) {
    console.warn('Could not create logs directory:', error.message);
  }
}

// Show environment settings
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`SKIP_NLP_MODELS: ${process.env.SKIP_NLP_MODELS}`);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  logger.error('UNCAUGHT EXCEPTION:', { error: err.stack || err.message || err });
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Set up Socket.IO with CORS
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io available globally for services that need it
global.io = io;

// Import routes and middleware
const errorHandler = require('./middleware/errorHandler');
const indexRoutes = require('./routes/index');

// Connect to the database and initialize services
const initializeServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Set up socket handlers after MongoDB connection
    try {
      const socketManager = require('./config/socketManager');
      socketManager(io);
      console.log('Socket.IO handlers initialized');
    } catch (error) {
      console.error('Socket initialization error:', error.message);
      logger.error('Socket initialization error:', { error });
    }

    // Start feedback processing queue
    try {
      feedQueue.startProcessing(io);
      console.log('Feedback processing queue started');
    } catch (error) {
      console.error('Feedback queue initialization error:', error.message);
      logger.error('Feedback queue initialization error:', { error });
    }

    // Setup auto-resolve alerts processor
    try {
      alertBroadcaster.setupAutoResolveProcessor(io, 5); // Check every 5 minutes
      console.log('Alert auto-resolve processor started');
    } catch (error) {
      console.error('Alert processor initialization error:', error.message);
      logger.error('Alert processor initialization error:', { error });
    }

  
    try {
      alertBroadcaster.setupPeriodicDigests(60); // Send digests every 60 minutes
      console.log('Periodic alert digests started');
    } catch (error) {
      console.error('Alert digest initialization error:', error.message);
      logger.error('Alert digest initialization error:', { error });
    }

    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(morgan('dev'));

 
    app.use((req, res, next) => {
      req.io = io;
      next();
    });

    // Routes
    app.use('/api', indexRoutes);

    // Production client files
    if (process.env.NODE_ENV === 'production') {
      app.use(express.static(path.join(__dirname, '../client/build')));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
      });
    }

 
    app.use(errorHandler);


    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Server initialization error: ${error.message}`);
    logger.error('Server initialization error:', { error });
    
    // Don't stop server startup even if there are errors
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (with initialization errors)`);
      logger.info(`Server running on port ${PORT} (with initialization errors)`);
    });
  }
};


initializeServer();


process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
  logger.error('UNHANDLED REJECTION:', { error: err.stack || err.message || err });
  if (process.env.NODE_ENV === 'production') {
    server.close(() => process.exit(1));
  }
});

module.exports = { app, server, io };