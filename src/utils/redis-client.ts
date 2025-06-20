import { createClient, RedisClientType } from 'redis';
import config from '../config';
import logger from './logger';

/**
 * Redis client interface
 */
export interface IRedisClient {
  connect(): Promise<boolean>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, expireSeconds?: number): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  disconnect(): Promise<void>;
  readonly isConnected: boolean;
}

/**
 * Redis client implementation with graceful fallback
 */
export class RedisClient implements IRedisClient {
  private client: RedisClientType | null = null;
  private _isConnected: boolean = false;

  /**
   * Get connection status
   */
  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Connect to Redis
   * Returns false if Redis is not configured or connection fails
   */
  async connect(): Promise<boolean> {
    if (!config.redis.host || config.redis.host === 'localhost') {
      logger.warn('Redis not configured or not available - running without state persistence');
      return false;
    }

    try {
      this.client = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port
        },
        ...(config.redis.password && { password: config.redis.password })
      });

      // Set up error handler
      this.client.on('error', (err) => {
        logger.error('Redis client error:', err);
      });

      await this.client.connect();
      this._isConnected = true;
      logger.info('Connected to Redis');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Redis connection failed - continuing without state persistence', errorMessage);
      this._isConnected = false;
      return false;
    }
  }

  /**
   * Get value from Redis
   */
  async get(key: string): Promise<string | null> {
    if (!this._isConnected || !this.client) return null;
    
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * Set value in Redis with optional expiration
   */
  async set(key: string, value: string, expireSeconds?: number): Promise<boolean> {
    if (!this._isConnected || !this.client) return false;
    
    try {
      if (expireSeconds) {
        await this.client.setEx(key, expireSeconds, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      return false;
    }
  }

  /**
   * Delete key from Redis
   */
  async delete(key: string): Promise<boolean> {
    if (!this._isConnected || !this.client) return false;
    
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis delete error:', error);
      return false;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client && this._isConnected) {
      await this.client.quit();
      this._isConnected = false;
      logger.info('Disconnected from Redis');
    }
  }
}

// Export singleton instance
const redisClient = new RedisClient();
export default redisClient;