const { Pool } = require('pg');

const pool = new Pool({
  host: '13.201.53.157',
  port: 5432,
  database: 'workflow_dev',
  user: 'postgres',
  password: 'postgres@123'
});

async function testQuery() {
  try {
    await pool.query("SET search_path TO lmsact");
    
    const departmentId = '9e941fcc-6b9b-4256-997e-a2be3a974e6c';
    
    // Test the NEW query using lms_department_id
    const query = `
      SELECT 
        csem.semester_number,
        csem.semester_number || CASE 
          WHEN csem.semester_number = 1 THEN 'st'
          WHEN csem.semester_number = 2 THEN 'nd'
          WHEN csem.semester_number = 3 THEN 'rd'
          ELSE 'th'
        END || ' Semester' as semester_name,
        MIN(csem.id::text)::uuid as content_map_sem_details_id,
        COUNT(DISTINCT csub.id) as total_subjects,
        COUNT(DISTINCT CASE WHEN ssa.is_active = TRUE THEN ssa.id END) as assigned_subjects
      FROM content_map_sem_details csem
      INNER JOIN content_map_master cmaster 
        ON csem.content_map_master_id = cmaster.id
      LEFT JOIN content_map_sub_details csub 
        ON csub.content_map_sem_details_id = csem.id
      LEFT JOIN subject_staff_assignments ssa 
        ON csub.id = ssa.content_map_sub_details_id AND ssa.is_active = TRUE
      WHERE cmaster.lms_department_id = $1
        AND cmaster.status != 'inactive'
      GROUP BY csem.semester_number
      ORDER BY csem.semester_number ASC
    `;
    
    const result = await pool.query(query, [departmentId]);
    
    console.log('✅ Query executed successfully!');
    console.log('✅ Semesters found:', result.rows.length);
    console.log('✅ Semesters data:', JSON.stringify(result.rows, null, 2));
    
    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    pool.end();
  }
}

testQuery();
