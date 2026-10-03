const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const config = require('./src/config/config');
const setupSocketGateway = require('./src/gateway/socketGateway');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

setupSocketGateway(io);

if (process.env.NODE_ENV !== 'test') {
  server.listen(config.PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Real-Time Chat Server running on port ${config.PORT}`);
    console.log(`🌐 HTTP API: http://localhost:${config.PORT}/api/health`);
    console.log(`====================================================`);
  });
}

module.exports = { server, app, io };
