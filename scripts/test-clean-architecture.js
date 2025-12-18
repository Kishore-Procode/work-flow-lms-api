#!/usr/bin/env node

/**
 * Clean Architecture Test Runner
 * 
 * Comprehensive test runner for Clean Architecture implementation.
 * Runs unit tests, integration tests, and validation tests with detailed reporting.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class CleanArchitectureTestRunner {
  constructor() {
    this.results = {
      unit: { passed: 0, failed: 0, total: 0, duration: 0 },
      integration: { passed: 0, failed: 0, total: 0, duration: 0 },
      validation: { passed: 0, failed: 0, total: 0, duration: 0 },
      coverage: { lines: 0, functions: 0, branches: 0, statements: 0 },
    };
    this.startTime = Date.now();
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  logHeader(message) {
    const border = '='.repeat(60);
    this.log(`\n${border}`, 'cyan');
    this.log(`${message}`, 'cyan');
    this.log(`${border}`, 'cyan');
  }

  logSection(message) {
    this.log(`\n${'-'.repeat(40)}`, 'blue');
    this.log(`${message}`, 'blue');
    this.log(`${'-'.repeat(40)}`, 'blue');
  }

  async runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn('npm', ['run', command], {
        stdio: 'pipe',
        shell: true,
        ...options,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          code,
          stdout,
          stderr,
        });
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  parseJestOutput(output) {
    const results = {
      passed: 0,
      failed: 0,
      total: 0,
      duration: 0,
    };

    // Parse test results
    const testMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (testMatch) {
      results.failed = parseInt(testMatch[1], 10);
      results.passed = parseInt(testMatch[2], 10);
      results.total = parseInt(testMatch[3], 10);
    } else {
      const passMatch = output.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
      if (passMatch) {
        results.passed = parseInt(passMatch[1], 10);
        results.total = parseInt(passMatch[2], 10);
        results.failed = results.total - results.passed;
      }
    }

    // Parse duration
    const durationMatch = output.match(/Time:\s+([\d.]+)\s*s/);
    if (durationMatch) {
      results.duration = parseFloat(durationMatch[1]);
    }

    return results;
  }

  parseCoverageOutput(output) {
    const coverage = {
      lines: 0,
      functions: 0,
      branches: 0,
      statements: 0,
    };

    // Parse coverage percentages
    const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
    if (coverageMatch) {
      coverage.statements = parseFloat(coverageMatch[1]);
      coverage.branches = parseFloat(coverageMatch[2]);
      coverage.functions = parseFloat(coverageMatch[3]);
      coverage.lines = parseFloat(coverageMatch[4]);
    }

    return coverage;
  }

  async runUnitTests() {
    this.logSection('Running Unit Tests');
    
    try {
      const result = await this.runCommand('test:unit');
      const parsed = this.parseJestOutput(result.stdout + result.stderr);
      
      this.results.unit = parsed;
      
      if (result.code === 0) {
        this.log(`✅ Unit tests passed: ${parsed.passed}/${parsed.total}`, 'green');
      } else {
        this.log(`❌ Unit tests failed: ${parsed.failed}/${parsed.total}`, 'red');
      }
      
      this.log(`⏱️  Duration: ${parsed.duration}s`, 'yellow');
      
      return result.code === 0;
    } catch (error) {
      this.log(`❌ Error running unit tests: ${error.message}`, 'red');
      return false;
    }
  }

  async runIntegrationTests() {
    this.logSection('Running Integration Tests');
    
    try {
      const result = await this.runCommand('test:integration');
      const parsed = this.parseJestOutput(result.stdout + result.stderr);
      
      this.results.integration = parsed;
      
      if (result.code === 0) {
        this.log(`✅ Integration tests passed: ${parsed.passed}/${parsed.total}`, 'green');
      } else {
        this.log(`❌ Integration tests failed: ${parsed.failed}/${parsed.total}`, 'red');
      }
      
      this.log(`⏱️  Duration: ${parsed.duration}s`, 'yellow');
      
      return result.code === 0;
    } catch (error) {
      this.log(`❌ Error running integration tests: ${error.message}`, 'red');
      return false;
    }
  }

  async runValidationTests() {
    this.logSection('Running Architecture Validation Tests');
    
    try {
      const result = await this.runCommand('test', {
        env: { ...process.env, TEST_PATTERN: 'validation' },
      });
      const parsed = this.parseJestOutput(result.stdout + result.stderr);
      
      this.results.validation = parsed;
      
      if (result.code === 0) {
        this.log(`✅ Validation tests passed: ${parsed.passed}/${parsed.total}`, 'green');
      } else {
        this.log(`❌ Validation tests failed: ${parsed.failed}/${parsed.total}`, 'red');
      }
      
      this.log(`⏱️  Duration: ${parsed.duration}s`, 'yellow');
      
      return result.code === 0;
    } catch (error) {
      this.log(`❌ Error running validation tests: ${error.message}`, 'red');
      return false;
    }
  }

  async runCoverageTests() {
    this.logSection('Running Coverage Analysis');
    
    try {
      const result = await this.runCommand('test:coverage');
      const coverage = this.parseCoverageOutput(result.stdout + result.stderr);
      
      this.results.coverage = coverage;
      
      this.log(`📊 Coverage Results:`, 'cyan');
      this.log(`   Lines: ${coverage.lines}%`, coverage.lines >= 70 ? 'green' : 'red');
      this.log(`   Functions: ${coverage.functions}%`, coverage.functions >= 70 ? 'green' : 'red');
      this.log(`   Branches: ${coverage.branches}%`, coverage.branches >= 70 ? 'green' : 'red');
      this.log(`   Statements: ${coverage.statements}%`, coverage.statements >= 70 ? 'green' : 'red');
      
      const overallCoverage = (coverage.lines + coverage.functions + coverage.branches + coverage.statements) / 4;
      
      if (overallCoverage >= 70) {
        this.log(`✅ Overall coverage: ${overallCoverage.toFixed(1)}%`, 'green');
        return true;
      } else {
        this.log(`❌ Overall coverage below threshold: ${overallCoverage.toFixed(1)}%`, 'red');
        return false;
      }
    } catch (error) {
      this.log(`❌ Error running coverage tests: ${error.message}`, 'red');
      return false;
    }
  }

  generateReport() {
    const totalTime = (Date.now() - this.startTime) / 1000;
    const totalTests = this.results.unit.total + this.results.integration.total + this.results.validation.total;
    const totalPassed = this.results.unit.passed + this.results.integration.passed + this.results.validation.passed;
    const totalFailed = this.results.unit.failed + this.results.integration.failed + this.results.validation.failed;

    this.logHeader('Clean Architecture Test Report');
    
    this.log(`📋 Test Summary:`, 'bright');
    this.log(`   Total Tests: ${totalTests}`);
    this.log(`   Passed: ${totalPassed}`, totalPassed === totalTests ? 'green' : 'yellow');
    this.log(`   Failed: ${totalFailed}`, totalFailed === 0 ? 'green' : 'red');
    this.log(`   Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
    this.log(`   Total Duration: ${totalTime.toFixed(2)}s`);

    this.log(`\n🧪 Test Breakdown:`, 'bright');
    this.log(`   Unit Tests: ${this.results.unit.passed}/${this.results.unit.total} (${this.results.unit.duration}s)`);
    this.log(`   Integration Tests: ${this.results.integration.passed}/${this.results.integration.total} (${this.results.integration.duration}s)`);
    this.log(`   Validation Tests: ${this.results.validation.passed}/${this.results.validation.total} (${this.results.validation.duration}s)`);

    this.log(`\n📊 Coverage Summary:`, 'bright');
    this.log(`   Lines: ${this.results.coverage.lines}%`);
    this.log(`   Functions: ${this.results.coverage.functions}%`);
    this.log(`   Branches: ${this.results.coverage.branches}%`);
    this.log(`   Statements: ${this.results.coverage.statements}%`);

    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests,
        totalPassed,
        totalFailed,
        successRate: (totalPassed / totalTests) * 100,
        totalDuration: totalTime,
      },
      results: this.results,
      status: totalFailed === 0 ? 'PASSED' : 'FAILED',
    };

    const reportPath = path.join(__dirname, '..', 'coverage', 'clean-architecture-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`\n📄 Detailed report saved to: ${reportPath}`, 'cyan');

    return totalFailed === 0;
  }

  async run() {
    this.logHeader('Clean Architecture Test Suite');
    
    this.log('🚀 Starting comprehensive test suite for Clean Architecture implementation...', 'bright');
    
    // Run all test suites
    const unitSuccess = await this.runUnitTests();
    const integrationSuccess = await this.runIntegrationTests();
    const validationSuccess = await this.runValidationTests();
    const coverageSuccess = await this.runCoverageTests();
    
    // Generate final report
    const overallSuccess = this.generateReport();
    
    if (overallSuccess) {
      this.log('\n🎉 All tests passed! Clean Architecture implementation is validated.', 'green');
      process.exit(0);
    } else {
      this.log('\n💥 Some tests failed. Please review the results above.', 'red');
      process.exit(1);
    }
  }
}

// Run the test suite if this script is executed directly
if (require.main === module) {
  const runner = new CleanArchitectureTestRunner();
  runner.run().catch((error) => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = CleanArchitectureTestRunner;
