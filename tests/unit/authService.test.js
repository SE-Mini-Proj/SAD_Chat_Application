const AuthService = require('../../src/services/authService');

describe('AuthService Unit Tests', () => {
  beforeEach(() => {
    AuthService.resetUsers();
  });

  describe('User Registration', () => {
    test('should successfully register a new user with hashed password', async () => {
      const result = await AuthService.register({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123'
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.username).toBe('testuser');
      expect(result.user).not.toHaveProperty('password');
      expect(typeof result.token).toBe('string');
    });

    test('should reject registration with missing fields', async () => {
      await expect(
        AuthService.register({ email: '', username: 'user', password: '123' })
      ).rejects.toThrow('MISSING_FIELDS');
    });

    test('should reject registration with invalid email format', async () => {
      await expect(
        AuthService.register({ email: 'invalid-email', username: 'user', password: 'password123' })
      ).rejects.toThrow('INVALID_EMAIL');
    });

    test('should reject registration with password shorter than 6 characters', async () => {
      await expect(
        AuthService.register({ email: 'valid@example.com', username: 'user', password: '123' })
      ).rejects.toThrow('WEAK_PASSWORD');
    });

    test('should prevent registering duplicate email addresses', async () => {
      await AuthService.register({
        email: 'duplicate@example.com',
        username: 'user1',
        password: 'password123'
      });

      await expect(
        AuthService.register({
          email: 'duplicate@example.com',
          username: 'user2',
          password: 'password123'
        })
      ).rejects.toThrow('EMAIL_EXISTS');
    });

    test('should prevent registering duplicate usernames', async () => {
      await AuthService.register({
        email: 'user1@example.com',
        username: 'uniqueName',
        password: 'password123'
      });

      await expect(
        AuthService.register({
          email: 'user2@example.com',
          username: 'uniqueName',
          password: 'password123'
        })
      ).rejects.toThrow('USERNAME_EXISTS');
    });
  });

  describe('User Login & JWT Verification', () => {
    beforeEach(async () => {
      await AuthService.register({
        email: 'alice@example.com',
        username: 'alice',
        password: 'SecretPassword123!'
      });
    });

    test('should authenticate valid credentials and return JWT token', async () => {
      const result = await AuthService.login({
        email: 'alice@example.com',
        password: 'SecretPassword123!'
      });

      expect(result).toHaveProperty('token');
      expect(result.user.username).toBe('alice');

      const decoded = AuthService.verifyToken(result.token);
      expect(decoded.username).toBe('alice');
      expect(decoded.email).toBe('alice@example.com');
    });

    test('should reject login with wrong password', async () => {
      await expect(
        AuthService.login({
          email: 'alice@example.com',
          password: 'WrongPassword'
        })
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });

    test('should reject login with non-existent email', async () => {
      await expect(
        AuthService.login({
          email: 'nobody@example.com',
          password: 'SecretPassword123!'
        })
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });

    test('should throw error on tampered JWT token verification', () => {
      expect(() => {
        AuthService.verifyToken('invalid.jwt.token');
      }).toThrow('INVALID_TOKEN');
    });
  });
});
