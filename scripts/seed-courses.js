#!/usr/bin/env node

/**
 * Seed Script: Course and Academic Structure Data
 * 
 * This script seeds the database with initial course data and academic structure
 * for existing colleges in the system.
 * 
 * @author Student - ACT Team
 * @version 1.0.0
 */

const { Pool } = require('pg');

// Load environment variables
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'osot',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres@123',
};

// Course data to seed
const courseData = [
  {
    name: 'Bachelor of Engineering',
    code: 'BE',
    type: 'BE',
    duration_years: 4,
    description: 'Undergraduate engineering program'
  },
  {
    name: 'Bachelor of Technology',
    code: 'BTech',
    type: 'BTech',
    duration_years: 4,
    description: 'Undergraduate technology program'
  },
  {
    name: 'Master of Engineering',
    code: 'ME',
    type: 'ME',
    duration_years: 2,
    description: 'Postgraduate engineering program'
  },
  {
    name: 'Master of Technology',
    code: 'MTech',
    type: 'MTech',
    duration_years: 2,
    description: 'Postgraduate technology program'
  },
  {
    name: 'Doctor of Philosophy',
    code: 'PhD',
    type: 'PhD',
    duration_years: 3,
    description: 'Doctoral research program'
  }
];

async function seedCourses() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔄 Starting course data seeding...');
    console.log(`📊 Database: ${dbConfig.database}`);
    console.log(`🏠 Host: ${dbConfig.host}:${dbConfig.port}`);
    
    // Get all colleges
    console.log('📋 Fetching colleges...');
    const collegesResult = await pool.query('SELECT id, name FROM colleges WHERE status = \'active\'');
    const colleges = collegesResult.rows;
    
    if (colleges.length === 0) {
      console.log('⚠️  No active colleges found. Please add colleges first.');
      return;
    }
    
    console.log(`📚 Found ${colleges.length} active colleges`);
    
    // Seed courses for each college
    for (const college of colleges) {
      console.log(`\n🏫 Processing college: ${college.name}`);
      
      for (const course of courseData) {
        try {
          // Check if course already exists for this college
          const existingCourse = await pool.query(
            'SELECT id FROM courses WHERE college_id = $1 AND code = $2',
            [college.id, course.code]
          );
          
          if (existingCourse.rows.length > 0) {
            console.log(`   ⏭️  Course ${course.code} already exists, skipping...`);
            continue;
          }
          
          // Insert course
          const courseResult = await pool.query(`
            INSERT INTO courses (name, code, type, duration_years, college_id, description)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, name, code
          `, [course.name, course.code, course.type, course.duration_years, college.id, course.description]);
          
          const insertedCourse = courseResult.rows[0];
          console.log(`   ✅ Created course: ${insertedCourse.name} (${insertedCourse.code})`);
          
          // Create academic years for this course
          for (let year = 1; year <= course.duration_years; year++) {
            const yearName = `${year}${year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year`;
            
            await pool.query(`
              INSERT INTO academic_years (course_id, year_number, year_name)
              VALUES ($1, $2, $3)
              ON CONFLICT (course_id, year_number) DO NOTHING
            `, [insertedCourse.id, year, yearName]);
            
            console.log(`      📅 Created academic year: ${yearName}`);
          }
          
        } catch (error) {
          console.error(`   ❌ Error creating course ${course.code}:`, error.message);
        }
      }
    }
    
    // Create sample sections for existing departments
    console.log('\n📋 Creating sample sections...');
    
    const departmentsResult = await pool.query(`
      SELECT d.id, d.name, d.college_id, c.name as course_name, c.id as course_id, c.duration_years
      FROM departments d
      JOIN courses c ON d.college_id = c.college_id
      WHERE c.type IN ('BE', 'BTech')
      LIMIT 10
    `);
    
    for (const dept of departmentsResult.rows) {
      // Get academic years for this course
      const academicYearsResult = await pool.query(
        'SELECT id, year_number, year_name FROM academic_years WHERE course_id = $1 ORDER BY year_number',
        [dept.course_id]
      );
      
      for (const academicYear of academicYearsResult.rows) {
        // Create sections A and B for each year
        for (const sectionName of ['A', 'B']) {
          try {
            await pool.query(`
              INSERT INTO sections (name, course_id, department_id, academic_year_id, academic_session)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (course_id, department_id, academic_year_id, name, academic_session) DO NOTHING
            `, [sectionName, dept.course_id, dept.id, academicYear.id, '2024-25']);
            
            console.log(`   📚 Created section: ${dept.name} - ${academicYear.year_name} - Section ${sectionName}`);
          } catch (error) {
            console.error(`   ❌ Error creating section:`, error.message);
          }
        }
      }
    }
    
    // Show summary
    console.log('\n📊 Seeding Summary:');
    
    const coursesCount = await pool.query('SELECT COUNT(*) FROM courses');
    const academicYearsCount = await pool.query('SELECT COUNT(*) FROM academic_years');
    const sectionsCount = await pool.query('SELECT COUNT(*) FROM sections');
    
    console.log(`   📚 Total Courses: ${coursesCount.rows[0].count}`);
    console.log(`   📅 Total Academic Years: ${academicYearsCount.rows[0].count}`);
    console.log(`   🏫 Total Sections: ${sectionsCount.rows[0].count}`);
    
    console.log('\n🎉 Course data seeding completed successfully!');
    console.log('💡 Next steps:');
    console.log('   1. Test the course API endpoints');
    console.log('   2. Update frontend registration forms');
    console.log('   3. Test student registration with new fields');
    
  } catch (error) {
    console.error('💥 Seeding failed:', error.message);
    console.error('📋 Error details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  seedCourses();
}

module.exports = seedCourses;
