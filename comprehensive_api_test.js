#!/usr/bin/env node

/**
 * Comprehensive API Testing Script for Student-ACT LMS
 * Tests all major endpoints and identifies database schema issues
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';
const DEMO_USERS = [
  { email: 'admin@demo.com', password: 'admin123', role: 'admin' },
  { email: 'principal@demo.com', password: 'admin123', role: 'principal' },
  { email: 'hod.cse@demo.com', password: 'admin123', role: 'hod' },
  { email: 'hod.ece@demo.com', password: 'admin123', role: 'hod' },
  { email: 'faculty@demo.com', password: 'admin123', role: 'faculty' },
  { email: 'staff@demo.com', password: 'admin123', role: 'staff' },
  { email: 'student1@demo.com', password: 'admin123', role: 'student' },
  { email: 'student2@demo.com', password: 'admin123', role: 'student' }
];

let testResults = {
  authentication: {},
  endpoints: {},
  errors: [],
  summary: { passed: 0, failed: 0, total: 0 }
};

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {}
    };
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500,
      details: error.response?.data?.error || error.message
    };
  }
}

// Test authentication for all demo users
async function testAuthentication() {
  console.log('\n🔐 Testing Authentication...');
  
  for (const user of DEMO_USERS) {
    const result = await apiRequest('POST', '/auth/login', {
      email: user.email,
      password: user.password
    });
    
    testResults.authentication[user.email] = {
      success: result.success,
      role: user.role,
      token: result.success ? result.data?.data?.token : null,
      error: result.success ? null : result.details
    };
    
    if (result.success) {
      console.log(`✅ ${user.email} (${user.role}): Login successful`);
      testResults.summary.passed++;
    } else {
      console.log(`❌ ${user.email} (${user.role}): ${result.details}`);
      testResults.summary.failed++;
      testResults.errors.push({
        test: 'Authentication',
        user: user.email,
        error: result.details
      });
    }
    testResults.summary.total++;
  }
}

// Test individual endpoints
async function testEndpoint(name, method, endpoint, token, expectedStatus = 200) {
  const result = await apiRequest(method, endpoint, null, token);
  
  testResults.endpoints[name] = {
    success: result.success && result.status === expectedStatus,
    status: result.status,
    error: result.success ? null : result.details,
    endpoint: `${method} ${endpoint}`
  };
  
  if (result.success && result.status === expectedStatus) {
    console.log(`✅ ${name}: ${method} ${endpoint}`);
    testResults.summary.passed++;
  } else {
    console.log(`❌ ${name}: ${method} ${endpoint} - ${result.details}`);
    testResults.summary.failed++;
    testResults.errors.push({
      test: name,
      endpoint: `${method} ${endpoint}`,
      error: result.details,
      status: result.status
    });
  }
  testResults.summary.total++;
  
  return result;
}

// Test all major endpoints
async function testEndpoints() {
  console.log('\n🌐 Testing API Endpoints...');
  
  // Get admin token for testing
  const adminAuth = testResults.authentication['admin@demo.com'];
  if (!adminAuth?.success) {
    console.log('❌ Cannot test endpoints - admin login failed');
    return;
  }
  
  const adminToken = adminAuth.token;
  
  // Core endpoints
  await testEndpoint('Health Check', 'GET', '/health', null);
  await testEndpoint('Users List', 'GET', '/users?page=1&limit=10', adminToken);
  await testEndpoint('Departments List', 'GET', '/departments', adminToken);
  await testEndpoint('Colleges List', 'GET', '/colleges', adminToken);
  await testEndpoint('Courses List', 'GET', '/courses', adminToken);
  await testEndpoint('Academic Years', 'GET', '/academic-years', adminToken);
  await testEndpoint('Learning Resources', 'GET', '/learning-resources?page=1&limit=5', adminToken);
  await testEndpoint('Sections', 'GET', '/sections', adminToken);
  
  // Dashboard endpoints
  await testEndpoint('Dashboard Activity', 'GET', '/dashboard/activity', adminToken);
  await testEndpoint('Admin States', 'GET', '/dashboard/admin/states', adminToken);
  await testEndpoint('College Ranking', 'GET', '/dashboard/admin/college-ranking', adminToken);
  
  // Registration and invitations
  await testEndpoint('Registration Requests', 'GET', '/registration-requests', adminToken);
  await testEndpoint('Invitations', 'GET', '/invitations', adminToken);
  
  // Content endpoints
  await testEndpoint('Content Resources', 'GET', '/content/resources', adminToken);
  await testEndpoint('Content Guidelines', 'GET', '/content/guidelines', adminToken);
  
  // Upload endpoints
  await testEndpoint('Recent Uploads', 'GET', '/uploads/photos/recent?limit=15', adminToken);
  
  // Student-specific endpoints (using student token)
  const studentAuth = testResults.authentication['student1@demo.com'];
  if (studentAuth?.success) {
    const studentToken = studentAuth.token;
    await testEndpoint('Student Profile', 'GET', '/auth/profile', studentToken);
    await testEndpoint('My Progress', 'GET', '/enrollment/my-progress', studentToken);
    await testEndpoint('My Selection', 'GET', '/enrollment/my-selection', studentToken);
    await testEndpoint('Selection Status', 'GET', '/enrollment/status', studentToken);
    await testEndpoint('Resource Catalog', 'GET', '/resource-catalog?departmentId=550e8400-e29b-41d4-a716-446655440001&limit=100', studentToken);
  }
}

// Analyze errors and categorize them
function analyzeErrors() {
  console.log('\n📊 Error Analysis...');

  const schemaErrors = testResults.errors.filter(e => {
    const errorStr = typeof e.error === 'string' ? e.error : JSON.stringify(e.error);
    return errorStr.includes('does not exist') ||
           errorStr.includes('column') ||
           errorStr.includes('relation');
  });

  const authErrors = testResults.errors.filter(e => {
    const errorStr = typeof e.error === 'string' ? e.error : JSON.stringify(e.error);
    return errorStr.includes('password') ||
           errorStr.includes('authentication') ||
           errorStr.includes('Unauthorized');
  });

  const connectionErrors = testResults.errors.filter(e => {
    const errorStr = typeof e.error === 'string' ? e.error : JSON.stringify(e.error);
    return errorStr.includes('connection') ||
           errorStr.includes('timeout');
  });
  
  console.log(`\n🔍 Schema Errors (${schemaErrors.length}):`);
  schemaErrors.forEach(error => {
    const errorStr = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
    console.log(`   - ${error.test}: ${errorStr}`);
  });

  console.log(`\n🔐 Authentication Errors (${authErrors.length}):`);
  authErrors.forEach(error => {
    const errorStr = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
    console.log(`   - ${error.test || error.user}: ${errorStr}`);
  });

  console.log(`\n🔌 Connection Errors (${connectionErrors.length}):`);
  connectionErrors.forEach(error => {
    const errorStr = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
    console.log(`   - ${error.test}: ${errorStr}`);
  });
}

// Generate summary report
function generateSummary() {
  console.log('\n📋 Test Summary');
  console.log('================');
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`Passed: ${testResults.summary.passed} ✅`);
  console.log(`Failed: ${testResults.summary.failed} ❌`);
  console.log(`Success Rate: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);
  
  console.log('\n🔐 Authentication Results:');
  Object.entries(testResults.authentication).forEach(([email, result]) => {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${email} (${result.role})`);
  });
  
  console.log('\n🌐 Endpoint Results:');
  Object.entries(testResults.endpoints).forEach(([name, result]) => {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${name}: ${result.endpoint}`);
  });
}

// Main test execution
async function runTests() {
  console.log('🚀 Starting Comprehensive API Testing for Student-ACT LMS');
  console.log('=========================================================');
  
  try {
    await testAuthentication();
    await testEndpoints();
    analyzeErrors();
    generateSummary();
    
    // Save results to file
    const fs = require('fs');
    fs.writeFileSync('test_results.json', JSON.stringify(testResults, null, 2));
    console.log('\n💾 Test results saved to test_results.json');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
}

// Run the tests
runTests();
