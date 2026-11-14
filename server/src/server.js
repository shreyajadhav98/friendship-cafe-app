const http = require('http');
const { Server } = require('socket.io');
const { getConfig } = require('./config/env');
const { createOriginValidator } = require('./config/cors');
const { connectDatabase } = require('./db/connect');
const { createApp } = require('./app');
const { initializeOrderSockets } = require('./sockets/orders');

function createHttpServer() {
  const config = getConfig();
  const app = createApp();
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, { cors: { origin: createOriginValidator(config), credentials: true } });
  app.set('io', io);
  initializeOrderSockets(io);
  return { httpServer, io, app };
}

async function start() {
  const config = getConfig();
  await connectDatabase(config.mongoUri);
  const { httpServer, io } = createHttpServer();
  httpServer.listen(config.port, '0.0.0.0', () => console.log(`Cafe API listening on port ${config.port}`));
  const shutdown = async (signal) => {
    console.log(`${signal} received; shutting down`);
    io.close(async () => {
      const mongoose = require('mongoose');
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

if (require.main === module) start().catch((error) => { console.error('Server startup failed:', error.message); process.exit(1); });

module.exports = { start, createHttpServer };
