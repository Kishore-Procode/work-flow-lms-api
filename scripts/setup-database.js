const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  console.log('🗄️  Setting up database...');
  
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Connect to database
    await client.connect();
    console.log('✅ Connected to database');

    // Read and execute schema
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📋 Creating database schema...');
    await client.query(schemaSQL);
    console.log('✅ Database schema created');

    // Read and execute seed data
    const seedPath = path.join(__dirname, '../database/seed.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    
    console.log('🌱 Inserting seed data...');
    await client.query(seedSQL);
    console.log('✅ Seed data inserted');

    // Verify setup
    const result = await client.query('SELECT COUNT(*) FROM users');
    const userCount = result.rows[0].count;
    console.log(`✅ Database setup complete! ${userCount} users created.`);

    console.log('\n🎉 Database is ready!');
    console.log('\nDefault admin login:');
    console.log('Email: admin@system.edu');
    console.log('Password: password123');
    console.log('\nNote: Change the default password in production!');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
