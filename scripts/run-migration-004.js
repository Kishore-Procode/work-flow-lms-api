#!/usr/bin/env node

/**
 * Migration Script: Add Enhanced Registration Fields
 * Run this script to apply migration 004_add_enhanced_registration_fields.sql
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'onestudent_onetree',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting migration: Add Enhanced Registration Fields...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../src/database/migrations/004_add_enhanced_registration_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!');
    console.log('📋 Added fields:');
    console.log('   - semester (VARCHAR(20))');
    console.log('   - batch_year (INTEGER)');
    console.log('   - year_of_study (VARCHAR(20))');
    console.log('   - address_line1, address_line2, city, state, district, pincode');
    console.log('   - aadhar_number (VARCHAR(12))');
    console.log('   - date_of_birth (DATE)');
    console.log('   - spoc_name, spoc_email, spoc_phone (for college registration)');
    console.log('🔍 Added indexes for performance optimization');
    console.log('✅ Added validation constraints for aadhar and pincode formats');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration().catch(console.error);
