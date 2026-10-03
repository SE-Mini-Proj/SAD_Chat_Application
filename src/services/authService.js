const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

// In-memory data store for users
let users = [];

class AuthService {
  static async register({ email, username, password }) {
    if (!email || !username || !password) {
      throw new Error('MISSING_FIELDS: Email, username, and password are required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('INVALID_EMAIL: Email format is invalid');
    }

    if (password.length < 6) {
      throw new Error('WEAK_PASSWORD: Password must be at least 6 characters long');
    }

    const existingEmail = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingEmail) {
      throw new Error('EMAIL_EXISTS: Email is already registered');
    }

    const existingUsername = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existingUsername) {
      throw new Error('USERNAME_EXISTS: Username is already taken');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      email: email.toLowerCase(),
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

    const token = this.generateToken(newUser);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        createdAt: newUser.createdAt
      },
      token
    };
  }

  static async login({ email, password }) {
    if (!email || !password) {
      throw new Error('MISSING_FIELDS: Email and password are required');
    }

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw new Error('INVALID_CREDENTIALS: Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('INVALID_CREDENTIALS: Invalid email or password');
    }

    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt
      },
      token
    };
  }

  static generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, config.JWT_SECRET);
    } catch (err) {
      throw new Error('INVALID_TOKEN: JWT token verification failed');
    }
  }

  static getUserById(id) {
    const user = users.find(u => u.id === id);
    if (!user) return null;
    return { id: user.id, email: user.email, username: user.username, createdAt: user.createdAt };
  }

  static resetUsers() {
    users = [];
  }
}

module.exports = AuthService;
