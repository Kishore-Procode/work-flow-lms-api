/**
 * Clean Architecture Server
 * 
 * Server entry point that integrates Clean Architecture with existing infrastructure.
 * Provides both Clean Architecture and legacy routes for gradual migration.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { config, validateConfig } from '../../config/environment';
import { testConnection, pool } from '../../config/database';
import { ExpressAppFactory } from './ExpressAppFactory';
import { DIContainer, DIContainerConfig } from '../container/DIContainer';
import { appLogger } from '../../utils/logger';

/**
 * Clean Architecture Server Class
 */
export class CleanArchitectureServer {
  private server: any;
  private isShuttingDown = false;

  /**
   * Initialize and start the server
   */
  public async start(): Promise<void> {
    try {
      // Validate configuration
      validateConfig();
      appLogger.info('Configuration validated successfully');

      // Initialize DIContainer
      await this.initializeDIContainer();
      appLogger.info('Dependency injection container initialized');

      // Test database connection
      await testConnection();
      appLogger.info('Database connection established');

      // Create Express application
      const app = ExpressAppFactory.createDefault();
      appLogger.info('Express application created with Clean Architecture integration');

      // Start server
      this.server = app.listen(config.server.port, () => {
        this.logServerStartup();
      });

      // Setup graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      appLogger.error('Failed to start server', { error });
      process.exit(1);
    }
  }

  /**
   * Initialize Dependency Injection Container
   */
  private async initializeDIContainer(): Promise<void> {
    const diConfig: DIContainerConfig = {
      database: {
        pool: pool,
      },
      jwt: {
        secret: config.jwt.secret,
        refreshSecret: config.jwt.refreshSecret,
        expiresIn: config.jwt.expiresIn,
        refreshExpiresIn: config.jwt.refreshExpiresIn,
      },
    };

    DIContainer.initialize(diConfig);
  }

  /**
   * Log server startup information
   */
  private logServerStartup(): void {
    const startupMessage = `
🚀 Student-ACT LMS API Server Started (Clean Architecture)
📍 Environment: ${config.server.nodeEnv}
🌐 Port: ${config.server.port}
📊 API Version: ${config.server.apiVersion}
🔗 Health Check: http://localhost:${config.server.port}/health
📚 API Docs: ${config.swagger.enabled ? `http://localhost:${config.server.port}/api/${config.server.apiVersion}/docs` : 'Disabled'}
🌍 Allowed Origins: ${config.frontend.urls.join(', ')}

🏗️ Architecture:
   ✅ Clean Architecture Routes: /api/${config.server.apiVersion}/*-ca
   ✅ Legacy Routes: /api/${config.server.apiVersion}/*
   ✅ Dependency Injection: Enabled
   ✅ Domain Layer: Implemented
   ✅ Use Cases: Implemented
   ✅ Interface Adapters: Implemented
   ✅ Infrastructure: Implemented

🔧 Available Endpoints:
   📋 Departments (CA): /api/${config.server.apiVersion}/departments-ca
   📋 Departments (Legacy): /api/${config.server.apiVersion}/departments
   👤 Users (Legacy): /api/${config.server.apiVersion}/users
   🏫 Colleges (Legacy): /api/${config.server.apiVersion}/colleges
   📚 Learning Resources (Legacy): /api/${config.server.apiVersion}/learning-resources
    `;

    console.log(startupMessage);
    appLogger.info('Server started successfully', {
      port: config.server.port,
      environment: config.server.nodeEnv,
      apiVersion: config.server.apiVersion,
      cleanArchitecture: true,
    });
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        appLogger.warn('Shutdown already in progress, forcing exit');
        process.exit(1);
      }

      this.isShuttingDown = true;
      appLogger.info(`Received ${signal}, starting graceful shutdown`);

      try {
        // Close HTTP server
        if (this.server) {
          await new Promise<void>((resolve, reject) => {
            this.server.close((err: any) => {
              if (err) {
                appLogger.error('Error closing HTTP server', { error: err });
                reject(err);
              } else {
                appLogger.info('HTTP server closed');
                resolve();
              }
            });
          });
        }

        // Close database connections
        await pool.end();
        appLogger.info('Database connections closed');

        appLogger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        appLogger.error('Error during graceful shutdown', { error });
        process.exit(1);
      }
    };

    // Handle different shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Nodemon restart

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      appLogger.error('Uncaught exception', { error });
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      appLogger.error('Unhandled promise rejection', { reason, promise });
      gracefulShutdown('unhandledRejection');
    });
  }

  /**
   * Stop the server
   */
  public async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server.close((err: any) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }
}

/**
 * Server factory functions
 */
export class ServerFactory {
  /**
   * Create server for development
   */
  public static createDevelopmentServer(): CleanArchitectureServer {
    return new CleanArchitectureServer();
  }

  /**
   * Create server for production
   */
  public static createProductionServer(): CleanArchitectureServer {
    return new CleanArchitectureServer();
  }

  /**
   * Create server for testing
   */
  public static createTestServer(): CleanArchitectureServer {
    return new CleanArchitectureServer();
  }
}

/**
 * Start server if this file is run directly
 */
if (require.main === module) {
  const server = new CleanArchitectureServer();
  server.start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

/**
 * Export for use in other modules
 */
export default CleanArchitectureServer;
