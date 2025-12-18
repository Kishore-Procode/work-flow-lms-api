import { Pool, PoolConfig } from 'pg';
import { config } from './environment';

// Database configuration
const dbConfig: PoolConfig = {
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  max: config.database.maxConnections,
  min: 2, // Minimum pool size
  idleTimeoutMillis: 30000, // 30 seconds - how long a client can be idle before being closed
  connectionTimeoutMillis: 10000, // 10 seconds - increased from 2 seconds to prevent timeout errors
  statement_timeout: 30000, // 30 seconds - maximum time for a query to execute
  query_timeout: 30000, // 30 seconds - query timeout
  keepAlive: true, // Enable TCP keep-alive
  keepAliveInitialDelayMillis: 10000, // 10 seconds before first keep-alive probe
};

// Create connection pool
export const pool = new Pool(dbConfig);

// Set schema for all connections
pool.on('connect', async (client) => {
  try {
    await client.query(`SET search_path TO ${config.database.schema}`);
    console.log(`✅ Schema set to: ${config.database.schema}`);
  } catch (error) {
    console.error('❌ Failed to set schema:', error);
  }
});

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle database client:', err);
  console.error('Error details:', {
    message: err.message,
    code: (err as any).code,
    stack: err.stack
  });
  // Don't exit the process - let the pool handle reconnection
  // Only log the error for monitoring
});

// Test database connection with retry logic
export const testConnection = async (retries = 3, delay = 2000): Promise<void> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      await client.query(`SET search_path TO ${config.database.schema}`);
      console.log(`✅ Database connected successfully to ${config.database.name}.${config.database.schema}`);
      console.log(`   Connection pool: max=${dbConfig.max}, min=${dbConfig.min}`);
      client.release();
      return;
    } catch (error: any) {
      console.error(`❌ Database connection attempt ${attempt}/${retries} failed:`, error.message);

      if (attempt === retries) {
        console.error('❌ All database connection attempts failed');
        console.error('   Please check:');
        console.error('   1. Database server is running');
        console.error('   2. Database credentials are correct');
        console.error('   3. Network connectivity to database');
        console.error('   4. Firewall settings');
        throw error;
      }

      console.log(`   Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Close database connection
export const closeConnection = async (): Promise<void> => {
  try {
    await pool.end();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
};

// Database query helper with error handling
export const query = async (text: string, params?: any[]): Promise<any> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', { text, error });
    throw error;
  }
};

// Transaction helper
export const transaction = async (callback: (client: any) => Promise<any>): Promise<any> => {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${config.database.schema}`);
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
