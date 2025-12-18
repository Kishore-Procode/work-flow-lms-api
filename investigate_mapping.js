const { Pool } = require('pg');

const pool = new Pool({
  host: '13.201.53.157',
  port: 5432,
  database: 'workflow_dev',
  user: 'postgres',
  password: 'postgres@123'
});

async function investigateIssue() {
  try {
    await pool.query("SET search_path TO lmsact");
    
    // Check content_map_master columns
    const cmColumns = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'lmsact' AND table_name = 'content_map_master'"
    );
    console.log('\n✅ content_map_master columns:', cmColumns.rows);
    
    // Check what type act_department_id is
    console.log('\n🔍 act_department_id data type:', cmColumns.rows.find(c => c.column_name === 'act_department_id'));
    
    // Try to find if there's a numeric ID somewhere
    const deptWithCode = await pool.query(
      "SELECT id, name, code FROM departments WHERE code = 'CSE'"
    );
    console.log('\n✅ All CSE departments:', deptWithCode.rows);
    
    // Check if act_department_id '1' or '3' might map to CSE
    const contentForNumeric = await pool.query(
      "SELECT cm.*, d.name as dept_name FROM content_map_master cm LEFT JOIN departments d ON d.id::text = cm.act_department_id WHERE cm.act_department_id IN ('1', '3', '33')"
    );
    console.log('\n✅ Content mappings with numeric IDs (trying to join):', contentForNumeric.rows.slice(0, 2));
    
    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    pool.end();
  }
}

investigateIssue();
