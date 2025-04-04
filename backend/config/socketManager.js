const socketHandler = require('../services/realtime/socketHandler');

const socketManager = (io) => {
  let activeConnections = 0;

  io.on('connection', (socket) => {
    activeConnections++;
    console.log(`New client connected. Active connections: ${activeConnections}`);
    
    socketHandler.setupEventHandlers(io, socket);
    
    socket.on('disconnect', () => {
      activeConnections--;
      console.log(`Client disconnected. Active connections: ${activeConnections}`);
    });
    
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  setInterval(() => {
    io.emit('heartbeat', { timestamp: new Date().toISOString() });
  }, 30000); // 30 seconds
  
  return io;
};

module.exports = socketManager;