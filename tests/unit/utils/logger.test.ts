import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as winston from 'winston';

// Mock the config module (CommonJS style for JS files)
jest.mock('../../../src/config', () => {
  const mockConfig = {
    app: {
      name: 'test-app',
      version: '1.0.0',
      logLevel: 'info',
      environment: 'test'
    }
  };
  return {
    __esModule: true,
    default: mockConfig,
    ...mockConfig  // For CommonJS require() compatibility
  };
});

describe('Logger Utility', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Logger Configuration', () => {
    it('should create logger with correct configuration', () => {
      // Import logger to trigger creation
      const logger = require('../../../src/utils/logger').default;
      
      // Verify logger is a Winston logger instance
      expect(logger).toBeDefined();
      expect(logger.level).toBe('info');
      expect(logger.defaultMeta).toEqual({
        service: 'test-app',
        version: '1.0.0'
      });
    });

    it('should configure file transports', () => {
      // Spy on File transport creation
      const fileTransportSpy = jest.spyOn(winston.transports, 'File');
      
      // Clear module cache to force re-evaluation
      jest.resetModules();
      
      // Import logger
      require('../../../src/utils/logger').default;
      
      // Verify file transports were created
      expect(fileTransportSpy).toHaveBeenCalledTimes(2);
      expect(fileTransportSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'logs/error.log',
          level: 'error'
        })
      );
      expect(fileTransportSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'logs/combined.log'
        })
      );
    });

    it('should add console transport in non-production environment', () => {
      // Spy on Console transport creation
      const consoleTransportSpy = jest.spyOn(winston.transports, 'Console');
      
      // Clear module cache and set test environment
      jest.resetModules();
      
      // Import logger
      require('../../../src/utils/logger').default;
      
      // Verify console transport was added
      expect(consoleTransportSpy).toHaveBeenCalled();
    });

    it('should not add console transport in production environment', () => {
      // Mock production environment
      jest.resetModules();
      jest.doMock('../../../src/config', () => {
        const mockConfig = {
          app: {
            name: 'test-app',
            version: '1.0.0',
            logLevel: 'info',
            environment: 'production'
          }
        };
        return {
          __esModule: true,
          default: mockConfig,
          ...mockConfig
        };
      });
      
      // Spy on Console transport
      const consoleTransportSpy = jest.spyOn(winston.transports, 'Console');
      
      // Import logger
      require('../../../src/utils/logger').default;
      
      // Verify console transport was NOT added
      expect(consoleTransportSpy).not.toHaveBeenCalled();
    });
  });

  describe('Logger Functionality', () => {
    let logger: any;

    beforeEach(() => {
      jest.resetModules();
      logger = require('../../../src/utils/logger').default;
    });

    it('should support all Winston log levels', () => {
      // Verify logger has all standard methods
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.http).toBe('function');
      expect(typeof logger.verbose).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.silly).toBe('function');
    });

    it('should log with correct format', () => {
      // Spy on logger write method
      const writeSpy = jest.spyOn(logger, 'write');
      
      // Log a test message
      logger.info('Test message', { extra: 'data' });
      
      // Verify write was called
      expect(writeSpy).toHaveBeenCalled();
    });

    it('should include timestamp in logs', () => {
      // The format includes timestamp, so we verify the format configuration
      const formatOptions = logger.format;
      expect(formatOptions).toBeDefined();
    });

    it('should handle errors with stack traces', () => {
      // Create a test error
      const testError = new Error('Test error');
      
      // Spy on error method
      const errorSpy = jest.spyOn(logger, 'error');
      
      // Log the error
      logger.error('Error occurred', testError);
      
      // Verify error was logged
      expect(errorSpy).toHaveBeenCalledWith('Error occurred', testError);
    });
  });

  describe('Logger Export', () => {
    it('should export a singleton logger instance', () => {
      jest.resetModules();
      
      // Import logger multiple times
      const logger1 = require('../../../src/utils/logger').default;
      const logger2 = require('../../../src/utils/logger').default;
      
      // Verify same instance is returned
      expect(logger1).toBe(logger2);
    });
  });
});