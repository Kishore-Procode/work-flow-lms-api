import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Validate required environment variables
const requiredEnvVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config = {
  // Server configuration
  server: {
    port: parseInt(process.env['PORT'] || '3000', 10),
    nodeEnv: process.env['NODE_ENV'] || 'development',
    apiVersion: process.env['API_VERSION'] || 'v1',
  },

  // Database configuration
  database: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME!,
    schema: process.env.DB_SCHEMA || 'public',
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // Email configuration
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    fromEmail: process.env.FROM_EMAIL || 'noreply@onestudentone resource.edu',
    fromName: process.env.FROM_NAME || 'Student-ACT LMS',
  },

  // File upload configuration
  upload: {
    path: process.env.UPLOAD_PATH || 'uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,pdf').split(','),
  },

  // Security configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Frontend configuration
  frontend: {
    // Primary frontend URL (for backwards compatibility)
    url: process.env.FRONTEND_URL || 'http://localhost:5173',

    // Multiple frontend URLs (comma-separated)
    urls: process.env.FRONTEND_URLS
      ? process.env.FRONTEND_URLS.split(',').map(url => url.trim())
      : [process.env.FRONTEND_URL || 'http://localhost:5173'],

    // Development frontend URL
    devUrl: process.env.FRONTEND_DEV_URL || 'http://localhost:5173',

    // Staging frontend URL
    stagingUrl: process.env.FRONTEND_STAGING_URL || process.env.FRONTEND_URL || 'http://localhost:5173',

    // Production frontend URL
    prodUrl: process.env.FRONTEND_PROD_URL || process.env.FRONTEND_URL || 'http://localhost:5173',
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
  },

  // API Documentation
  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true' || process.env.NODE_ENV === 'development',
  },

  // Business logic configuration
  business: {
    invitationExpiresDays: parseInt(process.env.INVITATION_EXPIRES_DAYS || '7', 10),
    registrationRequestExpiresDays: parseInt(process.env.REGISTRATION_REQUEST_EXPIRES_DAYS || '30', 10),
    monitoringReminderDays: parseInt(process.env.MONITORING_REMINDER_DAYS || '180', 10),
    photoRequiredMonitoring: process.env.PHOTO_REQUIRED_MONITORING === 'true',
  },
};

// Helper functions for frontend URL management
export const getFrontendUrl = (environment?: string): string => {
  const env = environment || config.server.nodeEnv;

  switch (env) {
    case 'development':
      return config.frontend.devUrl;
    case 'staging':
      return config.frontend.stagingUrl;
    case 'production':
      return config.frontend.prodUrl;
    default:
      return config.frontend.url;
  }
};

export const getAllowedOrigins = (): string[] => {
  return config.frontend.urls;
};

export const isOriginAllowed = (origin: string): boolean => {
  if (!origin) return true; // Allow requests with no origin

  // Check if origin is in the allowed list
  if (config.frontend.urls.includes(origin)) {
    return true;
  }

  // For development, allow localhost with any port
  if (config.server.nodeEnv === 'development') {
    const localhostPattern = /^https?:\/\/localhost(:\d+)?$/;
    const localhostIPPattern = /^https?:\/\/127\.0\.0\.1(:\d+)?$/;
    return localhostPattern.test(origin) || localhostIPPattern.test(origin);
  }

  return false;
};

// Validate configuration
export const validateConfig = (): void => {
  if (config.server.port < 1 || config.server.port > 65535) {
    throw new Error('Invalid port number');
  }

  if (config.database.port < 1 || config.database.port > 65535) {
    throw new Error('Invalid database port number');
  }

  if (config.security.bcryptRounds < 10 || config.security.bcryptRounds > 15) {
    throw new Error('Bcrypt rounds should be between 10 and 15');
  }

  console.log('✅ Configuration validated successfully');
};
