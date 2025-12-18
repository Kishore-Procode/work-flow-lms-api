const axios = require('axios');

async function testHODFeatures() {
  try {
    console.log('🔍 Testing HOD features after fix...\n');
    
    // Login with HOD credentials
    console.log('1️⃣ Logging in as HOD...');
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/login', {
      email: 'hod.cse@demo.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    console.log(`✅ Login successful: ${user.name} (${user.email})`);
    console.log(`   Department ID: ${user.departmentId}`);
    
    const headers = { 'Authorization': `Bearer ${token}` };
    
    // Test 1: Get Courses (already working)
    console.log('\n2️⃣ Testing courses endpoint...');
    const coursesResponse = await axios.get(
      'http://localhost:3000/api/v1/courses?departmentId=' + user.departmentId,
      { headers }
    );
    console.log(`✅ Courses: ${coursesResponse.data.data.length} courses found`);
    
    // Test 2: Get Semesters (THE FIX)
    if (coursesResponse.data.data.length > 0) {
      const courseId = coursesResponse.data.data[0].id;
      console.log(`\n3️⃣ Testing semesters endpoint for course: ${courseId}...`);
      const semestersResponse = await axios.get(
        `http://localhost:3000/api/v1/hod/subject-staff-assignment/semesters/${courseId}`,
        { headers }
      );
      console.log(`✅ Semesters: ${semestersResponse.data.semesters?.length || 0} semesters found`);
      if (semestersResponse.data.semesters?.length > 0) {
        console.log('   Semester details:', semestersResponse.data.semesters.map(s => 
          `${s.semester_name} (${s.total_subjects} subjects, ${s.assigned_subjects} assigned)`
        ).join(', '));
      }
    }
    
    // Test 3: LMS Departments dropdown (already fixed)
    console.log('\n4️⃣ Testing LMS departments dropdown...');
    const dropdownResponse = await axios.get(
      'http://localhost:3000/api/v1/content-mapping/dropdown-data',
      { headers }
    );
    console.log(`✅ LMS Departments: ${dropdownResponse.data.data.lmsDepartments?.length || 0} departments found`);
    
    // Test 4: Class In-Charge Overview
    console.log('\n5️⃣ Testing class in-charge overview...');
    try {
      const overviewResponse = await axios.get(
        'http://localhost:3000/api/v1/class-incharge/overview',
        { headers }
      );
      console.log(`✅ Class In-Charge Overview: ${overviewResponse.data.data?.sections?.length || 0} sections found`);
    } catch (error) {
      console.log(`❌ Class In-Charge Overview failed: ${error.response?.data?.message || error.message}`);
    }
    
    // Test 5: Staff Workload
    console.log('\n6️⃣ Testing staff workload...');
    try {
      const workloadResponse = await axios.get(
        'http://localhost:3000/api/v1/class-incharge/workload',
        { headers }
      );
      console.log(`✅ Staff Workload: ${workloadResponse.data.data?.workload?.length || 0} staff members found`);
    } catch (error) {
      console.log(`❌ Staff Workload failed: ${error.response?.data?.message || error.message}`);
    }
    
    // Test 6: Available Faculty
    console.log('\n7️⃣ Testing available faculty...');
    try {
      const facultyResponse = await axios.get(
        'http://localhost:3000/api/v1/class-incharge/faculty',
        { headers }
      );
      console.log(`✅ Available Faculty: ${facultyResponse.data.data?.faculty?.length || 0} faculty members found`);
    } catch (error) {
      console.log(`❌ Available Faculty failed: ${error.response?.data?.message || error.message}`);
    }
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testHODFeatures();
