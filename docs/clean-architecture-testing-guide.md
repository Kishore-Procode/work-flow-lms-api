# Clean Architecture Testing Guide

## Overview

This guide provides comprehensive testing strategies for the Clean Architecture implementation in the Student-ACT LMS system. It covers unit tests, integration tests, validation tests, and performance testing.

## Test Structure

```
tests/
├── setup.ts                           # Global test setup and utilities
├── unit/                              # Unit tests for individual components
│   ├── domain/
│   │   ├── entities/                  # Domain entity tests
│   │   ├── value-objects/             # Value object tests
│   │   └── services/                  # Domain service tests
│   └── application/
│       ├── use-cases/                 # Use case tests
│       └── dtos/                      # DTO tests
├── clean-architecture/                # Clean Architecture specific tests
│   ├── integration/                   # End-to-end integration tests
│   └── validation/                    # Architecture validation tests
└── integration/                       # Legacy integration tests
    └── *.test.ts
```

## Test Categories

### 1. Unit Tests

**Purpose**: Test individual components in isolation with mocked dependencies.

**Location**: `tests/unit/`

**Coverage**: Domain entities, value objects, use cases, DTOs

**Example**:
```typescript
// tests/unit/domain/entities/Department.test.ts
describe('Department Entity', () => {
  it('should create department with valid properties', () => {
    const department = Department.create({
      name: 'Computer Science',
      code: 'CSE',
      collegeId: 'college-123',
    });
    
    expect(department.getName()).toBe('Computer Science');
    expect(department.getCode()).toBe('CSE');
  });
});
```

### 2. Integration Tests

**Purpose**: Test complete request-response cycles through all layers.

**Location**: `tests/clean-architecture/integration/`

**Coverage**: HTTP endpoints, database operations, middleware chains

**Example**:
```typescript
// tests/clean-architecture/integration/DepartmentController.test.ts
describe('Department Controller Integration', () => {
  it('should create department successfully', async () => {
    const response = await request(app)
      .post('/api/v1/departments-ca')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validDepartmentData)
      .expect(201);
      
    expect(response.body.success).toBe(true);
  });
});
```

### 3. Architecture Validation Tests

**Purpose**: Validate Clean Architecture principles and constraints.

**Location**: `tests/clean-architecture/validation/`

**Coverage**: Dependency injection, layer separation, architectural rules

**Example**:
```typescript
// tests/clean-architecture/validation/ArchitectureValidation.test.ts
describe('Layer Separation', () => {
  it('should maintain domain layer independence', () => {
    const department = Department.create(validProps);
    expect(department).toBeInstanceOf(Department);
    // Domain entities should not depend on external frameworks
  });
});
```

## Running Tests

### Quick Commands

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit                    # Unit tests only
npm run test:integration            # Integration tests only
npm run test:ca-unit                # Clean Architecture unit tests
npm run test:ca-integration         # Clean Architecture integration tests
npm run test:ca-validation          # Architecture validation tests

# Coverage and reporting
npm run test:coverage               # Generate coverage report
npm run test:clean-architecture     # Comprehensive Clean Architecture test suite
```

### Comprehensive Test Suite

```bash
# Run the complete Clean Architecture test suite with reporting
npm run test:clean-architecture
```

This command runs:
1. Unit tests for domain and application layers
2. Integration tests for HTTP endpoints
3. Architecture validation tests
4. Coverage analysis
5. Performance validation
6. Generates detailed JSON report

## Test Configuration

### Jest Configuration

**File**: `jest.config.js`

Key features:
- TypeScript support with `ts-jest`
- Module path mapping for Clean Architecture layers
- Coverage thresholds (70% minimum, 85% for domain layer)
- Test projects for different test types
- Comprehensive reporting with JUnit XML output

### Environment Setup

**File**: `tests/setup.ts`

Provides:
- Database connection management
- Test data seeding and cleanup
- Mock configurations
- JWT token generation
- Test utilities and helpers

## Writing Tests

### Domain Entity Tests

```typescript
describe('Department Entity', () => {
  describe('Business Rules', () => {
    it('should enforce student count validation', () => {
      const department = Department.create(validProps);
      
      expect(() => department.updateStudentCount(-1))
        .toThrow('Student count cannot be negative');
    });
    
    it('should allow deletion only when no students enrolled', () => {
      const department = Department.create(validProps);
      
      department.updateStudentCount(0);
      expect(department.canBeDeleted()).toBe(true);
      
      department.updateStudentCount(50);
      expect(department.canBeDeleted()).toBe(false);
    });
  });
});
```

### Use Case Tests

```typescript
describe('CreateDepartmentUseCase', () => {
  let useCase: CreateDepartmentUseCase;
  let mockDepartmentRepo: jest.Mocked<IDepartmentRepository>;
  let mockUserRepo: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockDepartmentRepo = createMockDepartmentRepository();
    mockUserRepo = createMockUserRepository();
    useCase = new CreateDepartmentUseCase(mockDepartmentRepo, mockUserRepo);
  });

  it('should create department successfully', async () => {
    // Arrange
    const request = CreateDepartmentRequest.fromHttpRequest(validData, adminUser);
    mockDepartmentRepo.existsByCode.mockResolvedValue(false);
    mockDepartmentRepo.save.mockResolvedValue(expectedDepartment);

    // Act
    const response = await useCase.execute(request);

    // Assert
    expect(response).toBeInstanceOf(CreateDepartmentResponse);
    expect(mockDepartmentRepo.save).toHaveBeenCalledWith(expect.any(Department));
  });
});
```

### Integration Tests

```typescript
describe('Department API Integration', () => {
  let app: Application;
  let testDb: Pool;

  beforeAll(async () => {
    testDb = await getTestDb();
    DIContainer.initialize({ database: { pool: testDb }, jwt: jwtConfig });
    app = ExpressAppFactory.createForTesting();
  });

  it('should handle complete department creation flow', async () => {
    const response = await request(app)
      .post('/api/v1/departments-ca')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validDepartmentData)
      .expect(201);

    // Verify response format
    expect(response.body).toMatchObject({
      success: true,
      message: 'Department created successfully',
      data: expect.objectContaining({
        id: expect.any(String),
        name: validDepartmentData.name,
      }),
    });

    // Verify database persistence
    const dbResult = await testDb.query(
      'SELECT * FROM departments WHERE code = $1',
      [validDepartmentData.code]
    );
    expect(dbResult.rows).toHaveLength(1);
  });
});
```

## Test Data Management

### Test Database Setup

```typescript
// tests/setup.ts
export const getTestDb = async (): Promise<Pool> => {
  const pool = new Pool({
    host: process.env.TEST_DB_HOST,
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME,
    user: process.env.TEST_DB_USER,
    password: process.env.TEST_DB_PASSWORD,
  });
  
  await pool.query(`SET search_path TO ${process.env.TEST_DB_SCHEMA}`);
  return pool;
};
```

### Test Data Factories

```typescript
export const generateTestData = {
  department: (overrides = {}) => ({
    name: 'Test Department',
    code: `TEST${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
    collegeId: 'test-college-id',
    ...overrides,
  }),
  
  user: (role = 'student', overrides = {}) => ({
    name: 'Test User',
    email: `test-${Date.now()}@test.com`,
    role,
    collegeId: 'test-college-id',
    ...overrides,
  }),
};
```

## Coverage Requirements

### Minimum Coverage Thresholds

- **Global**: 70% (lines, functions, branches, statements)
- **Domain Layer**: 85% (higher standard for business logic)
- **Application Layer**: 80% (use cases and DTOs)
- **Interface Adapters**: 75% (controllers and routes)

### Coverage Reports

```bash
# Generate HTML coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

## Continuous Integration

### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Clean Architecture Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:12
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run test:clean-architecture
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v1
        with:
          file: ./coverage/lcov.info
```

## Performance Testing

### Entity Creation Performance

```typescript
it('should create entities efficiently', () => {
  const startTime = Date.now();
  
  for (let i = 0; i < 1000; i++) {
    Department.create({
      name: `Department ${i}`,
      code: `DEPT${i}`,
      collegeId: 'college-123',
    });
  }
  
  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(100); // Should complete in <100ms
});
```

### Memory Leak Detection

```typescript
it('should not create memory leaks', () => {
  const initialMemory = process.memoryUsage().heapUsed;
  
  // Create and discard many entities
  for (let i = 0; i < 10000; i++) {
    const dept = Department.create(testData);
    // Entity goes out of scope
  }
  
  if (global.gc) global.gc(); // Force garbage collection
  
  const finalMemory = process.memoryUsage().heapUsed;
  const memoryIncrease = finalMemory - initialMemory;
  
  expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // <10MB increase
});
```

## Debugging Tests

### Debug Configuration

```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--testPathPattern=Department"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Test Debugging Tips

1. **Use `describe.only` and `it.only`** to run specific tests
2. **Add `console.log` statements** for debugging (remove before commit)
3. **Use Jest's `--verbose` flag** for detailed output
4. **Check database state** in integration tests with direct queries
5. **Verify mock calls** with `expect(mockFn).toHaveBeenCalledWith(...)`

## Best Practices

### Test Organization

1. **Group related tests** with `describe` blocks
2. **Use descriptive test names** that explain the scenario
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Keep tests independent** - each test should be able to run in isolation
5. **Use `beforeEach` and `afterEach`** for setup and cleanup

### Mock Management

1. **Mock external dependencies** at the boundary
2. **Use Jest's built-in mocking** for consistency
3. **Reset mocks between tests** with `jest.clearAllMocks()`
4. **Verify mock interactions** to ensure correct behavior
5. **Avoid over-mocking** - test real behavior when possible

### Test Data

1. **Use factories** for generating test data
2. **Make test data obvious** - use clear, descriptive values
3. **Avoid shared mutable state** between tests
4. **Clean up test data** after each test
5. **Use realistic data** that matches production scenarios

## Troubleshooting

### Common Issues

1. **Database connection errors**: Check test database configuration
2. **Timeout errors**: Increase Jest timeout for slow operations
3. **Memory leaks**: Ensure proper cleanup in `afterEach` hooks
4. **Mock not working**: Verify mock is imported before the module being tested
5. **Coverage not updating**: Clear Jest cache with `jest --clearCache`

### Getting Help

1. Check the test output for specific error messages
2. Review the generated coverage report for missed lines
3. Use the comprehensive test runner for detailed reporting
4. Check the Clean Architecture integration guide for setup issues
