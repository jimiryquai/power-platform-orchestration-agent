import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the config module (CommonJS style for JS files)
jest.mock('../../../src/config', () => {
  const mockConfig = {
    redis: {
      host: 'localhost',
      port: 6379,
      password: undefined
    }
  };
  return {
    __esModule: true,
    default: mockConfig,
    ...mockConfig  // For CommonJS require() compatibility
  };
});

// Mock the logger module
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock redis module
jest.mock('redis', () => ({
  createClient: jest.fn()
}));

describe('Redis Client Integration', () => {
  let redisClient: any;
  let mockRedisClient: any;
  let mockLogger: any;
  const redis = require('redis');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Setup mock Redis client
    mockRedisClient = {
      connect: jest.fn(() => Promise.resolve()),
      get: jest.fn(),
      set: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      quit: jest.fn(() => Promise.resolve()),
      on: jest.fn()
    };
    
    redis.createClient.mockReturnValue(mockRedisClient);
    mockLogger = require('../../../src/utils/logger');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Connection Management', () => {
    it('should skip connection when Redis is not configured', async () => {
      // Import fresh instance
      redisClient = require('../../../src/utils/redis-client').default;
      
      // Attempt connection
      const result = await redisClient.connect();
      
      // Verify
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Redis not configured or not available - running without state persistence'
      );
      expect(redis.createClient).not.toHaveBeenCalled();
    });

    it('should connect successfully with valid configuration', async () => {
      // Mock config with valid Redis host
      jest.doMock('../../../src/config', () => {
        const mockConfig = {
          redis: {
            host: 'redis-server',
            port: 6379,
            password: 'test-password'
          }
        };
        return {
          __esModule: true,
          default: mockConfig,
          ...mockConfig
        };
      });
      
      // Import fresh instance
      redisClient = require('../../../src/utils/redis-client').default;
      
      // Connect
      const result = await redisClient.connect();
      
      // Verify
      expect(result).toBe(true);
      expect(redisClient.isConnected).toBe(true);
      expect(redis.createClient).toHaveBeenCalledWith({
        host: 'redis-server',
        port: 6379,
        password: 'test-password'
      });
      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Connected to Redis');
    });

    it('should handle connection failure gracefully', async () => {
      // Mock config with valid Redis host
      jest.doMock('../../../src/config', () => {
        const mockConfig = {
          redis: {
            host: 'redis-server',
            port: 6379,
            password: undefined
          }
        };
        return {
          __esModule: true,
          default: mockConfig,
          ...mockConfig
        };
      });
      
      // Mock connection failure
      mockRedisClient.connect.mockRejectedValue(new Error('Connection refused'));
      
      // Import fresh instance
      redisClient = require('../../../src/utils/redis-client').default;
      
      // Attempt connection
      const result = await redisClient.connect();
      
      // Verify
      expect(result).toBe(false);
      expect(redisClient.isConnected).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Redis connection failed - continuing without state persistence',
        'Connection refused'
      );
    });

    it('should disconnect properly', async () => {
      // Setup connected client
      jest.doMock('../../../src/config', () => {
        const mockConfig = {
          redis: {
            host: 'redis-server',
            port: 6379
          }
        };
        return {
          __esModule: true,
          default: mockConfig,
          ...mockConfig
        };
      });
      
      redisClient = require('../../../src/utils/redis-client').default;
      await redisClient.connect();
      
      // Disconnect
      await redisClient.disconnect();
      
      // Verify
      expect(redisClient.isConnected).toBe(false);
      expect(mockRedisClient.quit).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Disconnected from Redis');
    });
  });

  describe('Data Operations', () => {
    beforeEach(async () => {
      // Setup connected client
      jest.doMock('../../../src/config', () => {
        const mockConfig = {
          redis: {
            host: 'redis-server',
            port: 6379
          }
        };
        return {
          __esModule: true,
          default: mockConfig,
          ...mockConfig
        };
      });
      
      redisClient = require('../../../src/utils/redis-client').default;
      await redisClient.connect();
    });

    describe('get operation', () => {
      it('should get value when connected', async () => {
        mockRedisClient.get.mockResolvedValue('test-value');
        
        const result = await redisClient.get('test-key');
        
        expect(result).toBe('test-value');
        expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
      });

      it('should return null when not connected', async () => {
        redisClient.isConnected = false;
        
        const result = await redisClient.get('test-key');
        
        expect(result).toBe(null);
        expect(mockRedisClient.get).not.toHaveBeenCalled();
      });

      it('should handle get errors gracefully', async () => {
        mockRedisClient.get.mockRejectedValue(new Error('Redis error'));
        
        const result = await redisClient.get('test-key');
        
        expect(result).toBe(null);
        expect(mockLogger.error).toHaveBeenCalledWith('Redis get error:', expect.any(Error));
      });
    });

    describe('set operation', () => {
      it('should set value without expiration', async () => {
        mockRedisClient.set.mockResolvedValue('OK');
        
        const result = await redisClient.set('test-key', 'test-value');
        
        expect(result).toBe(true);
        expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', 'test-value');
        expect(mockRedisClient.setEx).not.toHaveBeenCalled();
      });

      it('should set value with expiration', async () => {
        mockRedisClient.setEx.mockResolvedValue('OK');
        
        const result = await redisClient.set('test-key', 'test-value', 3600);
        
        expect(result).toBe(true);
        expect(mockRedisClient.setEx).toHaveBeenCalledWith('test-key', 3600, 'test-value');
        expect(mockRedisClient.set).not.toHaveBeenCalled();
      });

      it('should return false when not connected', async () => {
        redisClient.isConnected = false;
        
        const result = await redisClient.set('test-key', 'test-value');
        
        expect(result).toBe(false);
        expect(mockRedisClient.set).not.toHaveBeenCalled();
      });

      it('should handle set errors gracefully', async () => {
        mockRedisClient.set.mockRejectedValue(new Error('Redis error'));
        
        const result = await redisClient.set('test-key', 'test-value');
        
        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith('Redis set error:', expect.any(Error));
      });
    });

    describe('delete operation', () => {
      it('should delete key when connected', async () => {
        mockRedisClient.del.mockResolvedValue(1);
        
        const result = await redisClient.delete('test-key');
        
        expect(result).toBe(true);
        expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
      });

      it('should return false when not connected', async () => {
        redisClient.isConnected = false;
        
        const result = await redisClient.delete('test-key');
        
        expect(result).toBe(false);
        expect(mockRedisClient.del).not.toHaveBeenCalled();
      });

      it('should handle delete errors gracefully', async () => {
        mockRedisClient.del.mockRejectedValue(new Error('Redis error'));
        
        const result = await redisClient.delete('test-key');
        
        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith('Redis delete error:', expect.any(Error));
      });
    });
  });

  describe('Singleton Pattern', () => {
    it('should export a singleton instance', () => {
      const instance1 = require('../../../src/utils/redis-client').default;
      const instance2 = require('../../../src/utils/redis-client').default;
      
      expect(instance1).toBe(instance2);
    });
  });
});