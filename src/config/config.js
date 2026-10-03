const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-key-chat-app-2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  NODE_ENV: process.env.NODE_ENV || 'development'
};
