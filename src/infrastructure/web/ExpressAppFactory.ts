/**
 * Express Application Factory (Clean Architecture)
 * 
 * Factory for creating Express.js application with Clean Architecture integration.
 * Maintains all existing middleware, security, and configuration while adding
 * Clean Architecture routes alongside legacy routes.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { config, isOriginAllowed } from '../../config/environment';
import { swaggerSpec, swaggerUiOptions } from '../../config/swagger';
import { initializeUploadDirectories, getUploadConfig } from '../../config/upload.config';
import { errorHandler } from '../../middleware/errorHandler';
import { DIContainer, DIContainerConfig } from '../container/DIContainer';
import { createDepartmentRoutes } from '../../interface-adapters/routes/DepartmentRoutes';
import { createContentMappingRoutes } from '../../interface-adapters/routes/ContentMappingRoutes';

// Import existing routes
import legacyRoutes from '../../routes';

export interface ExpressAppConfig {
  enableCleanArchitecture: boolean;
  enableLegacyRoutes: boolean;
  enableSwagger: boolean;
  enableCors: boolean;
  enableSecurity: boolean;
  enableLogging: boolean;
  enableCompression: boolean;
  enableUploads: boolean;
}

export class ExpressAppFactory {
  private app: Application;
  private appConfig: ExpressAppConfig;

  constructor(appConfig: Partial<ExpressAppConfig> = {}) {
    this.app = express();
    this.appConfig = {
      enableCleanArchitecture: true,
      enableLegacyRoutes: true,
      enableSwagger: config.swagger.enabled,
      enableCors: true,
      enableSecurity: true,
      enableLogging: config.server.nodeEnv !== 'test',
      enableCompression: true,
      enableUploads: true,
      ...appConfig,
    };
  }

  /**
   * Create and configure Express application
   */
  public create(): Application {
    this.setupSecurity();
    this.setupCors();
    this.setupCompression();
    this.setupLogging();
    this.setupBodyParsing();
    this.setupUploads();
    this.setupSwagger();
    this.setupHealthCheck();
    this.setupRoutes();
    this.setupErrorHandling();
    
    return this.app;
  }

  /**
   * Setup security middleware
   */
  private setupSecurity(): void {
    if (!this.appConfig.enableSecurity) return;

    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'self'"],
          // Allow PDFs and uploads to be embedded in iframes from frontend origins
          frameAncestors: config.server.nodeEnv === 'development'
            ? ["'self'", "http://localhost:*", "http://127.0.0.1:*"]
            : ["'self'", ...config.frontend.urls],
        },
      },
    }));
  }

  /**
   * Setup CORS configuration
   */
  private setupCors(): void {
    if (!this.appConfig.enableCors) return;

    this.app.use(cors({
      origin: (origin, callback) => {
        if (isOriginAllowed(origin || '')) {
          return callback(null, true);
        }

        const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
        return callback(new Error(msg), false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));
  }

  /**
   * Setup compression middleware
   */
  private setupCompression(): void {
    if (!this.appConfig.enableCompression) return;

    this.app.use(compression());
  }

  /**
   * Setup logging middleware
   */
  private setupLogging(): void {
    if (!this.appConfig.enableLogging) return;

    this.app.use(morgan('combined'));
  }

  /**
   * Setup body parsing middleware
   */
  private setupBodyParsing(): void {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  /**
   * Setup file upload configuration
   */
  private setupUploads(): void {
    if (!this.appConfig.enableUploads) return;

    initializeUploadDirectories();
    
    const uploadConfig = getUploadConfig();
    this.app.use(uploadConfig.staticFilesBaseUrl, express.static(uploadConfig.uploadPath));
  }

  /**
   * Setup Swagger documentation
   */
  private setupSwagger(): void {
    if (!this.appConfig.enableSwagger) return;

    // Swagger UI
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
    
    // Versioned Swagger UI
    this.app.use(`/api/${config.server.apiVersion}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
    
    // OpenAPI JSON
    this.app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });
  }

  /**
   * Setup health check endpoint
   */
  private setupHealthCheck(): void {
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: config.server.nodeEnv,
        version: config.server.apiVersion,
        architecture: {
          cleanArchitecture: this.appConfig.enableCleanArchitecture,
          legacyRoutes: this.appConfig.enableLegacyRoutes,
        },
        documentation: this.appConfig.enableSwagger ? {
          swagger: `/api-docs`,
          openapi: `/api-docs.json`,
          versioned: `/api/${config.server.apiVersion}/docs`
        } : null,
      });
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Clean Architecture routes (new)
    if (this.appConfig.enableCleanArchitecture) {
      this.setupCleanArchitectureRoutes();
    }

    // Legacy routes (existing)
    if (this.appConfig.enableLegacyRoutes) {
      this.setupLegacyRoutes();
    }

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl,
      });
    });
  }

  /**
   * Setup Clean Architecture routes
   */
  private setupCleanArchitectureRoutes(): void {
    const apiVersion = config.server.apiVersion;
    
    // Department routes (Clean Architecture)
    this.app.use(`/api/${apiVersion}/departments-ca`, createDepartmentRoutes());

    // Content Mapping routes (Clean Architecture)
    this.app.use(`/api/${apiVersion}/content-mapping`, createContentMappingRoutes());

    // TODO: Add other Clean Architecture routes as they are implemented
    // this.app.use(`/api/${apiVersion}/users-ca`, createUserRoutes());
    // this.app.use(`/api/${apiVersion}/colleges-ca`, createCollegeRoutes());
    // this.app.use(`/api/${apiVersion}/learning-resources-ca`, createLearningResourceRoutes());
  }

  /**
   * Setup legacy routes
   */
  private setupLegacyRoutes(): void {
    this.app.use(legacyRoutes);
  }

  /**
   * Setup error handling middleware
   */
  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  /**
   * Initialize DIContainer with database configuration
   */
  public static initializeDIContainer(diConfig: DIContainerConfig): void {
    DIContainer.initialize(diConfig);
  }

  /**
   * Create application with default configuration
   */
  public static createDefault(): Application {
    const factory = new ExpressAppFactory();
    return factory.create();
  }

  /**
   * Create application for testing
   */
  public static createForTesting(): Application {
    const factory = new ExpressAppFactory({
      enableLogging: false,
      enableSwagger: false,
      enableUploads: false,
    });
    return factory.create();
  }

  /**
   * Create application with only Clean Architecture routes
   */
  public static createCleanArchitectureOnly(): Application {
    const factory = new ExpressAppFactory({
      enableCleanArchitecture: true,
      enableLegacyRoutes: false,
    });
    return factory.create();
  }

  /**
   * Create application with only legacy routes
   */
  public static createLegacyOnly(): Application {
    const factory = new ExpressAppFactory({
      enableCleanArchitecture: false,
      enableLegacyRoutes: true,
    });
    return factory.create();
  }
}

/**
 * Default export for convenience
 */
export default ExpressAppFactory;
