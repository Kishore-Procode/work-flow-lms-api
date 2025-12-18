import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { config, validateConfig, isOriginAllowed } from './config/environment';
import { testConnection } from './config/database';
import { swaggerSpec, swaggerUiOptions } from './config/swagger';
import { initializeUploadDirectories } from './config/upload.config';

// Initialize Express app
const app = express();

// Validate configuration
validateConfig();

// Security middleware
app.use(helmet({
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

// CORS configuration with multiple frontend URL support
app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin || '')) {
      return callback(null, true);
    }

    // Reject the request
    const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression middleware
app.use(compression());

// Logging middleware
if (config.server.nodeEnv !== 'test') {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize upload directories
initializeUploadDirectories();

// Get the workflow files path from environment or auto-detect
import fs from 'fs';
import path from 'path';
import os from 'os';

let workflowFilesPath = process.env.WORKFLOW_FILES_PATH;

// If not configured, auto-detect from /var/www/workflowmgmt/files
if (!workflowFilesPath) {
  const possiblePaths: string[] = [];

  // On Windows, check all drive letters
  if (os.platform() === 'win32') {
    for (let i = 67; i <= 90; i++) { // C to Z
      const drive = String.fromCharCode(i);
      possiblePaths.push(`${drive}:\\var\\www\\workflowmgmt\\files`);
    }
  } else {
    // On Linux/Mac
    possiblePaths.push('/var/www/workflowmgmt/files');
  }

  // Find the first path that exists
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      workflowFilesPath = testPath;
      console.log(`✅ Auto-detected workflow files path: ${workflowFilesPath}`);
      break;
    }
  }

  if (!workflowFilesPath) {
    console.warn(`⚠️ Could not auto-detect workflow files path. Tried: ${possiblePaths.join(', ')}`);
    workflowFilesPath = os.platform() === 'win32'
      ? 'D:\\var\\www\\workflowmgmt\\files'
      : '/var/www/workflowmgmt/files'; // Fallback
  }
}

console.log(`📁 Workflow files path: ${workflowFilesPath}`);

// Verify the directory exists
const uploadsPath = path.join(workflowFilesPath, 'uploads');
if (fs.existsSync(uploadsPath)) {
  console.log(`✅ Uploads directory exists at: ${uploadsPath}`);
} else {
  console.log(`❌ Uploads directory does NOT exist: ${uploadsPath}`);
}

// Serve workflow management system files (syllabus PDFs and other resources)
// Map /uploads URL route to the uploads subdirectory within workflow files
app.use('/uploads', express.static(uploadsPath, {
  dotfiles: 'allow',
  index: false,
  redirect: false
}));
console.log(`✅ Serving files from uploads directory at /uploads: ${uploadsPath}`);

// Serve certificates
const certificatesPath = path.join(process.cwd(), 'certificates');
app.use('/certificates', express.static(certificatesPath, {
  dotfiles: 'deny',
  index: false,
  redirect: false
}));
console.log(`✅ Serving certificates from /certificates: ${certificatesPath}`);

// Swagger API Documentation
if (config.swagger.enabled) {
  // Serve swagger spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  // Alternative endpoint for docs
  app.use(`/api/${config.server.apiVersion}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
    version: config.server.apiVersion,
    documentation: config.swagger.enabled ? {
      swagger: `/api-docs`,
      openapi: `/api-docs.json`,
      versioned: `/api/${config.server.apiVersion}/docs`
    } : null,
  });
});

// Initialize DIContainer for Clean Architecture routes
import { DIContainer } from './infrastructure/container/DIContainer';
import { pool } from './config/database';

DIContainer.initialize({
  database: {
    pool: pool
  },
  jwt: {
    secret: config.jwt.secret,
    refreshSecret: config.jwt.refreshSecret,
    expiresIn: config.jwt.expiresIn,
    refreshExpiresIn: config.jwt.refreshExpiresIn
  }
});

// Import routes
import routes from './routes';

// Mount API routes
app.use(routes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(config.server.nodeEnv === 'development' && { stack: err.stack }),
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Start listening
    const server = app.listen(config.server.port, () => {
      console.log(`
🚀 Student-ACT LMS API Server Started
📍 Environment: ${config.server.nodeEnv}
🌐 Port: ${config.server.port}
📊 API Version: ${config.server.apiVersion}
🔗 Health Check: http://localhost:${config.server.port}/health
📚 API Docs: ${config.swagger.enabled ? `http://localhost:${config.server.port}/api/${config.server.apiVersion}/docs` : 'Disabled'}
🌍 Allowed Origins: ${config.frontend.urls.join(', ')}
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        console.log('HTTP server closed');

        try {
          const { closeConnection } = await import('./config/database');
          await closeConnection();
          console.log('Database connections closed');
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
if (require.main === module) {
  startServer();
}

export default app;
