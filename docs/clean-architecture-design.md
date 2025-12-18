# Student-ACT LMS Clean Architecture Design

## Overview
This document outlines the Clean Architecture design for refactoring the Student-ACT LMS backend while preserving all existing functionality and API contracts.

## Current vs Target Architecture

### Current Architecture (Violations)
```
Routes → Controllers → Services → Repositories → Database
```
**Issues:**
- Controllers directly instantiate services
- Services directly call repositories
- Business logic mixed with framework concerns
- No clear domain layer
- Database implementation details leak to services

### Target Clean Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Frameworks & Drivers                 │
│  Express.js │ PostgreSQL │ JWT │ Nodemailer │ File System │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                   Interface Adapters                    │
│    Controllers │ Presenters │ Gateways │ DTOs │ Mappers  │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                  Use Cases (Application)                │
│   Auth Use Cases │ User Management │ College Management  │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                   Entities (Domain)                     │
│     User │ College │ Department │ LearningResource       │
└─────────────────────────────────────────────────────────┘
```

## Layer Definitions

### 1. Entities/Domain Layer (Innermost)
**Purpose:** Core business entities and rules, completely independent of frameworks

**Components:**
- **Entities:** User, College, Department, LearningResource, Course, etc.
- **Value Objects:** Email, Password, Role, Status, etc.
- **Domain Services:** Business logic that doesn't belong to a single entity
- **Repository Interfaces:** Abstract contracts for data access
- **Domain Events:** Business events for decoupling

**Key Principles:**
- No dependencies on external frameworks
- Contains business rules and validation
- Defines interfaces that outer layers implement

### 2. Use Cases/Application Layer
**Purpose:** Application-specific business rules and orchestration

**Components:**
- **Use Cases:** LoginUser, CreateCollege, EnrollStudent, etc.
- **Input/Output DTOs:** Request/Response models for use cases
- **Application Services:** Orchestrate domain entities and external services
- **Interfaces:** For external services (email, file storage, etc.)

**Key Principles:**
- Orchestrates domain entities
- Implements application-specific business rules
- Depends only on domain layer

### 3. Interface Adapters Layer
**Purpose:** Convert data between use cases and external world

**Components:**
- **Controllers:** HTTP request/response handling
- **Presenters:** Format output for different clients
- **Gateways:** Implement repository interfaces
- **DTOs:** Data transfer objects for API
- **Mappers:** Convert between DTOs and domain entities

**Key Principles:**
- Adapts external interfaces to internal use cases
- Handles data conversion and validation
- No business logic

### 4. Frameworks & Drivers Layer (Outermost)
**Purpose:** External tools and frameworks

**Components:**
- **Web Framework:** Express.js
- **Database:** PostgreSQL with connection pooling
- **Authentication:** JWT token handling
- **External Services:** Email, file storage, etc.
- **Configuration:** Environment variables, settings

## Dependency Inversion Implementation

### Current Problem
```typescript
// Controller directly creates service
export const login = async (req: Request, res: Response) => {
  const authService = new AuthService(); // ❌ Direct dependency
  const result = await authService.login(loginData);
};

// Service directly creates repository
class AuthService {
  async login(data: LoginRequest) {
    const user = await userRepository.findByEmail(email); // ❌ Direct dependency
  }
}
```

### Clean Architecture Solution
```typescript
// Use Case (Application Layer)
interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
}

class LoginUserUseCase {
  constructor(private userRepository: IUserRepository) {}
  
  async execute(request: LoginRequest): Promise<LoginResponse> {
    const user = await this.userRepository.findByEmail(request.email);
    // Business logic here
  }
}

// Controller (Interface Adapter)
class AuthController {
  constructor(private loginUseCase: LoginUserUseCase) {}
  
  async login(req: Request, res: Response) {
    const result = await this.loginUseCase.execute(req.body);
    res.json(this.formatResponse(result));
  }
}

// Repository Implementation (Frameworks & Drivers)
class PostgreSQLUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    // PostgreSQL specific implementation
  }
}
```

## Preservation Strategy

### API Contract Preservation
- Controllers maintain identical request/response formats
- HTTP status codes remain unchanged
- Error messages and structures preserved
- Pagination and filtering behavior identical

### Authentication Flow Preservation
```typescript
// Current: authenticate → authorize → controller
// Target: authenticate → authorize → controller → use case

// Middleware chain remains identical
app.use('/api/v1/users', authenticate, authorize('admin'), userRoutes);
```

### Database Schema Preservation
- All existing queries must produce identical results
- Transaction patterns preserved
- Connection pooling maintained
- Schema migrations unaffected

### Role-Based Access Control Preservation
```typescript
// Role hierarchy preserved
const ROLE_HIERARCHY = {
  'super_admin': 100,
  'admin': 80,
  'principal': 60,
  'hod': 40,
  'staff': 20,
  'student': 10,
};
```

## Implementation Phases

### Phase 3: Core Domain Implementation
1. Create domain entities with business rules
2. Define repository interfaces
3. Implement value objects and domain services
4. Create domain events system

### Phase 4: Use Cases Implementation
1. Create use case classes for each business operation
2. Define input/output DTOs
3. Implement application services
4. Create interfaces for external services

### Phase 5: Interface Adapters Implementation
1. Refactor controllers to use use cases
2. Create DTOs and mappers
3. Implement repository interfaces
4. Create presenters for response formatting

### Phase 6: Infrastructure Integration
1. Implement PostgreSQL repository adapters
2. Create IoC container for dependency injection
3. Configure external service adapters
4. Update middleware to work with new structure

### Phase 7: Testing & Validation
1. Update unit tests for new structure
2. Ensure integration tests pass
3. Validate API compatibility
4. Test frontend integration

### Phase 8: Documentation & Deployment
1. Update architecture documentation
2. Create developer guidelines
3. Update deployment scripts
4. Performance testing and optimization

## Implementation Status

### ✅ Phase 1: Analysis & Current Architecture Documentation (COMPLETE)
- [x] Mapped current backend structure (20+ modules)
- [x] Documented API contracts & endpoints (50+ endpoints)
- [x] Analyzed database layer & repository patterns
- [x] Reviewed authentication & authorization mechanisms
- [x] Assessed current testing structure

### ✅ Phase 2: Clean Architecture Design & Planning (COMPLETE)
- [x] Designed Domain/Entities Layer with business rules
- [x] Created Use Cases/Application Layer with DTOs
- [x] Designed Interface Adapters Layer (Controllers, DTOs, Mappers)
- [x] Created Dependency Injection Container
- [x] Implemented Infrastructure services (Password, Token)

### 📋 Next Implementation Phases

#### Phase 3: Core Domain Implementation
- [ ] Complete all domain entities (Department, LearningResource, Course, etc.)
- [ ] Implement all value objects and domain services
- [ ] Create comprehensive domain repository interfaces
- [ ] Add domain events system

#### Phase 4: Use Cases Implementation
- [ ] Implement all authentication use cases
- [ ] Create user management use cases
- [ ] Build college and department management use cases
- [ ] Add learning resource management use cases
- [ ] Implement dashboard and reporting use cases

#### Phase 5: Interface Adapters Implementation
- [ ] Refactor all existing controllers to use use cases
- [ ] Create comprehensive DTOs and mappers
- [ ] Implement all repository interfaces
- [ ] Update middleware to work with new structure

#### Phase 6: Infrastructure & Framework Integration
- [ ] Complete PostgreSQL repository implementations
- [ ] Update database connection and transaction handling
- [ ] Integrate external service adapters (email, file storage)
- [ ] Update Express.js route configuration

#### Phase 7: Testing & Validation
- [ ] Update unit tests for new architecture
- [ ] Ensure all integration tests pass
- [ ] Validate API compatibility with existing contracts
- [ ] Test frontend integration thoroughly

#### Phase 8: Documentation & Deployment
- [ ] Update architecture documentation
- [ ] Create developer guidelines for new structure
- [ ] Update deployment scripts and configurations
- [ ] Performance testing and optimization

## Files Created in Phase 2

### Domain Layer
- `src/domain/entities/base/DomainEntity.ts` - Base entity class
- `src/domain/entities/User.ts` - User domain entity with business rules
- `src/domain/entities/College.ts` - College domain entity
- `src/domain/value-objects/Email.ts` - Email value object with validation
- `src/domain/value-objects/UserRole.ts` - Role hierarchy and permissions
- `src/domain/value-objects/UserStatus.ts` - User status with business rules
- `src/domain/errors/DomainError.ts` - Domain-specific error handling
- `src/domain/repositories/IUserRepository.ts` - Repository interface

### Application Layer
- `src/application/use-cases/auth/LoginUserUseCase.ts` - Login business logic
- `src/application/use-cases/user/GetUsersUseCase.ts` - User retrieval with RBAC
- `src/application/dtos/auth/LoginUserRequest.ts` - Login input DTO
- `src/application/dtos/auth/LoginUserResponse.ts` - Login output DTO
- `src/application/dtos/user/GetUsersRequest.ts` - User query DTO
- `src/application/dtos/user/GetUsersResponse.ts` - User response DTO
- `src/application/interfaces/IPasswordService.ts` - Password service interface
- `src/application/interfaces/ITokenService.ts` - Token service interface

### Interface Adapters Layer
- `src/interface-adapters/controllers/AuthController.ts` - HTTP auth controller
- `src/interface-adapters/controllers/UserController.ts` - HTTP user controller
- `src/interface-adapters/constants/HttpStatusCode.ts` - Status code constants
- `src/interface-adapters/dtos/ApiResponse.ts` - Standardized API responses

### Infrastructure Layer
- `src/infrastructure/repositories/PostgreSQLUserRepository.ts` - User repository implementation
- `src/infrastructure/services/BcryptPasswordService.ts` - Password service implementation
- `src/infrastructure/services/JWTTokenService.ts` - JWT token service implementation
- `src/infrastructure/container/DIContainer.ts` - Dependency injection container

## Success Criteria
- [ ] All existing API endpoints work identically
- [ ] Frontend requires no changes
- [ ] All tests pass
- [ ] Performance is maintained or improved
- [ ] Code is more maintainable and testable
- [ ] Business logic is framework-independent
