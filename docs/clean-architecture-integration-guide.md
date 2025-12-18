# Clean Architecture Integration Guide

## Overview

This guide explains how to integrate the new Clean Architecture implementation with the existing Student-ACT LMS system. The integration provides both Clean Architecture routes and legacy routes for gradual migration.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    HTTP Layer (Express.js)                  │
├─────────────────────────────────────────────────────────────┤
│  Clean Architecture Routes    │    Legacy Routes            │
│  /api/v1/*-ca                │    /api/v1/*                │
├─────────────────────────────────────────────────────────────┤
│                Interface Adapters Layer                     │
│  • Controllers                                              │
│  • DTOs                                                     │
│  • Route Handlers                                           │
├─────────────────────────────────────────────────────────────┤
│                Application Layer                            │
│  • Use Cases                                                │
│  • Application Services                                     │
│  • Input/Output DTOs                                        │
├─────────────────────────────────────────────────────────────┤
│                Domain Layer                                 │
│  • Entities                                                 │
│  • Value Objects                                            │
│  • Domain Services                                          │
│  • Repository Interfaces                                    │
├─────────────────────────────────────────────────────────────┤
│                Infrastructure Layer                         │
│  • Repository Implementations                               │
│  • External Service Adapters                               │
│  • Framework Integrations                                   │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Using the New Clean Architecture Server

```typescript
// Start server with Clean Architecture integration
import { CleanArchitectureServer } from './src/infrastructure/web/CleanArchitectureServer';

const server = new CleanArchitectureServer();
await server.start();
```

### 2. Using the Express App Factory

```typescript
// Create app with both Clean Architecture and legacy routes
import { ExpressAppFactory } from './src/infrastructure/web/ExpressAppFactory';

const app = ExpressAppFactory.createDefault();
app.listen(3000);
```

### 3. Using Only Clean Architecture Routes

```typescript
// Create app with only Clean Architecture routes
const app = ExpressAppFactory.createCleanArchitectureOnly();
app.listen(3000);
```

## Available Endpoints

### Clean Architecture Endpoints

| Method | Endpoint | Description | Status |
|--------|----------|-------------|---------|
| GET | `/api/v1/departments-ca` | Get departments with pagination | ✅ Implemented |
| POST | `/api/v1/departments-ca` | Create new department | ✅ Implemented |
| GET | `/api/v1/departments-ca/:id` | Get department by ID | ✅ Implemented |
| PUT | `/api/v1/departments-ca/:id` | Update department | 🚧 Partial |
| DELETE | `/api/v1/departments-ca/:id` | Delete department | 🚧 Partial |
| GET | `/api/v1/departments-ca/public` | Public departments list | ✅ Implemented |

### Legacy Endpoints (Unchanged)

| Method | Endpoint | Description | Status |
|--------|----------|-------------|---------|
| GET | `/api/v1/departments` | Get departments | ✅ Working |
| POST | `/api/v1/departments` | Create department | ✅ Working |
| GET | `/api/v1/users` | Get users | ✅ Working |
| GET | `/api/v1/colleges` | Get colleges | ✅ Working |

## Migration Strategy

### Phase 1: Parallel Routes (Current)
- Clean Architecture routes: `/api/v1/*-ca`
- Legacy routes: `/api/v1/*`
- Both systems running simultaneously
- Frontend can gradually migrate endpoints

### Phase 2: Feature Flag Migration
```typescript
// Environment variable to control routing
const USE_CLEAN_ARCHITECTURE = process.env.USE_CLEAN_ARCHITECTURE === 'true';

if (USE_CLEAN_ARCHITECTURE) {
  app.use('/api/v1/departments', cleanArchitectureDepartmentRoutes);
} else {
  app.use('/api/v1/departments', legacyDepartmentRoutes);
}
```

### Phase 3: Complete Migration
- Replace legacy routes with Clean Architecture
- Remove `-ca` suffix from Clean Architecture routes
- Deprecate legacy code

## Configuration

### Environment Variables

```env
# Clean Architecture Configuration
USE_CLEAN_ARCHITECTURE=true
ENABLE_LEGACY_ROUTES=true
ENABLE_CA_ROUTES=true

# Database Configuration (unchanged)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=student_act_lms
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration (unchanged)
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

### DIContainer Configuration

```typescript
import { DIContainer } from './src/infrastructure/container/DIContainer';
import { pool } from './src/config/database';
import { config } from './src/config/environment';

// Initialize dependency injection
DIContainer.initialize({
  database: { pool },
  jwt: {
    secret: config.jwt.secret,
    refreshSecret: config.jwt.refreshSecret,
    expiresIn: config.jwt.expiresIn,
    refreshExpiresIn: config.jwt.refreshExpiresIn,
  },
});
```

## Testing

### Unit Testing Clean Architecture Components

```typescript
import { DIContainer } from './src/infrastructure/container/DIContainer';

// Create test container with mocks
const testContainer = DIContainer.createTestContainer({
  userRepository: mockUserRepository,
  departmentRepository: mockDepartmentRepository,
  passwordService: mockPasswordService,
  tokenService: mockTokenService,
});

// Test use cases
const createDepartmentUseCase = testContainer.createDepartmentUseCase;
const result = await createDepartmentUseCase.execute(request);
```

### Integration Testing

```typescript
import { ExpressAppFactory } from './src/infrastructure/web/ExpressAppFactory';
import request from 'supertest';

// Create test app
const app = ExpressAppFactory.createForTesting();

// Test Clean Architecture endpoints
const response = await request(app)
  .get('/api/v1/departments-ca')
  .expect(200);
```

## Monitoring and Observability

### Health Check

```bash
curl http://localhost:3000/health
```

Response includes architecture status:
```json
{
  "success": true,
  "message": "Server is running",
  "architecture": {
    "cleanArchitecture": true,
    "legacyRoutes": true
  }
}
```

### Logging

Clean Architecture components use structured logging:

```typescript
import { appLogger } from './src/utils/logger';

// Use case logging
appLogger.info('Department created', {
  departmentId: department.getId(),
  userId: request.requestingUser.id,
  useCase: 'CreateDepartmentUseCase'
});
```

## Performance Considerations

### Database Connection Pooling
- Shared connection pool between Clean Architecture and legacy code
- No additional database connections required
- Transaction support maintained

### Memory Usage
- Dependency injection container uses singleton pattern
- Lazy initialization of dependencies
- Minimal memory overhead

### Response Times
- Clean Architecture adds ~1-2ms overhead for dependency resolution
- Use case execution is optimized for performance
- Database queries remain unchanged

## Security

### Authentication & Authorization
- Same JWT tokens work for both architectures
- Role-based access control preserved
- Middleware chains identical

### Input Validation
- Enhanced validation with Joi schemas
- SQL injection prevention maintained
- XSS protection preserved

## Troubleshooting

### Common Issues

1. **DIContainer not initialized**
   ```
   Error: DIContainer must be initialized before use
   ```
   Solution: Call `DIContainer.initialize(config)` before starting server

2. **Route conflicts**
   ```
   Error: Cannot set headers after they are sent
   ```
   Solution: Ensure Clean Architecture routes use `-ca` suffix

3. **Database connection issues**
   ```
   Error: Pool has ended
   ```
   Solution: Use shared pool from `./src/config/database`

### Debug Mode

```typescript
// Enable debug logging
process.env.LOG_LEVEL = 'debug';

// Create app with debug info
const app = ExpressAppFactory.createDefault();
```

## Next Steps

1. **Complete Department Module**
   - Implement UpdateDepartmentUseCase
   - Implement DeleteDepartmentUseCase
   - Add comprehensive validation

2. **Add More Modules**
   - User management (Clean Architecture)
   - College management (Clean Architecture)
   - Learning resource management (Clean Architecture)

3. **Frontend Integration**
   - Update API client to use Clean Architecture endpoints
   - Implement feature flags for gradual migration
   - Add error handling for new response formats

4. **Performance Optimization**
   - Add caching layer
   - Optimize database queries
   - Implement request/response compression

## Support

For questions or issues with Clean Architecture integration:

1. Check the health endpoint: `/health`
2. Review application logs in `logs/app.log`
3. Verify DIContainer initialization
4. Test with Clean Architecture endpoints (`*-ca`)

## References

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Dependency Injection Patterns](https://martinfowler.com/articles/injection.html)
