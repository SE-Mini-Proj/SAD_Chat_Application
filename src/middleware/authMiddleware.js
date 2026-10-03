const AuthService = require('../services/authService');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access token is required in Authorization header (Bearer <token>)',
        timestamp: new Date().toISOString()
      }
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = AuthService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: err.message || 'Token is invalid or expired',
        timestamp: new Date().toISOString()
      }
    });
  }
};

module.exports = authMiddleware;
