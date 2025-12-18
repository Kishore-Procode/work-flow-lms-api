const axios = require('axios');

async function testAPI() {
  try {
    // First login to get token
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/login', {
      email: 'hod@cse.act.edu.in',
      password: 'Hod@12345'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful, got token');
    
    // Test the semesters endpoint
    const courseId = 'c74134eb-4bc4-49de-b2ce-7a2f387009bc';
    const semestersResponse = await axios.get(
      `http://localhost:3000/api/v1/hod/subject-staff-assignment/semesters/${courseId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('\n✅ Semesters API Response:');
    console.log(JSON.stringify(semestersResponse.data, null, 2));
    console.log('\n✅ Number of semesters:', semestersResponse.data.semesters?.length || 0);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAPI();
