const redis = require('redis');
const config = require('../config');
const logger = require('./logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.isOptional = true; // Redis is optional for Phase 1
  }

  async connect() {
    if (!config.redis.host || config.redis.host === 'localhost') {
      logger.warn('Redis not configured or not available - running without state persistence');
      return false;
    }

    try {
      this.client = redis.createClient({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password
      });

      await this.client.connect();
      this.isConnected = true;
      logger.info('Connected to Redis');
      return true;
    } catch (error) {
      logger.warn('Redis connection failed - continuing without state persistence', error.message);
      this.isConnected = false;
      return false;
    }
  }

  async get(key) {
    if (!this.isConnected) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  async set(key, value, expireSeconds) {
    if (!this.isConnected) return false;
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

  async delete(key) {
    if (!this.isConnected) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis delete error:', error);
      return false;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Disconnected from Redis');
    }
  }
}

module.exports = new RedisClient();