#!/usr/bin/env node

/**
 * Migration Script: Add Course and Academic Hierarchy
 * 
 * This script runs the 005 migration to add the Course table and 
 * proper academic hierarchy to the database.
 * 
 * @author Student - ACT Team
 * @version 1.0.0
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'OnestdOneTreeDB',
  user: process.env.DB_USER || 'pearl',
  password: process.env.DB_PASSWORD || '1968',
};

async function runMigration() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔄 Starting Course and Academic Hierarchy migration...');
    console.log(`📊 Database: ${dbConfig.database}`);
    console.log(`🏠 Host: ${dbConfig.host}:${dbConfig.port}`);
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../src/database/migrations/005_add_course_and_academic_hierarchy.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📋 Executing migration...');
    
    // Execute migration
    const result = await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📋 Added structures:');
    console.log('   - courses table with course types (BE, ME, BTech, MTech, PhD)');
    console.log('   - academic_years table for year levels within courses');
    console.log('   - sections table for class sections');
    console.log('   - Updated departments table with course_id reference');
    console.log('   - Updated users table with course_id, section_id, academic_year_id');
    console.log('   - Updated registration_requests table with course references');
    console.log('🔍 Added indexes for performance optimization');
    console.log('✅ Added foreign key constraints and triggers');
    
    // Verify the new tables exist
    console.log('\n🔍 Verifying new table structure...');
    
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('courses', 'academic_years', 'sections')
      ORDER BY table_name;
    `);
    
    console.log('📊 New tables created:');
    tableCheck.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    // Check if course_id columns were added
    const columnCheck = await pool.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND column_name = 'course_id'
      AND table_name IN ('departments', 'users', 'registration_requests')
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Course ID columns added to:');
    columnCheck.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}.${row.column_name}`);
    });
    
    console.log('\n🎉 Migration 005 completed successfully!');
    console.log('💡 Next steps:');
    console.log('   1. Update TypeScript types to include Course, AcademicYear, Section');
    console.log('   2. Create API endpoints for course management');
    console.log('   3. Update registration forms to include course selection');
    console.log('   4. Seed initial course data for existing colleges');
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    console.error('📋 Error details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
