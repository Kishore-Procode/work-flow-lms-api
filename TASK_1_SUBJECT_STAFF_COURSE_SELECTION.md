/**
 * PROFESSIONAL FIX: Subject Staff Assignment with Course Selection
 * Date: 2025-11-02
 * Author: ACT-LMS Team
 * 
 * Changes:
 * 1. Added course dropdown - HOD selects course first
 * 2. Semesters load based on selected course
 * 3. Subjects load based on selected semester
 * 4. Fixed staff loading with proper error handling
 * 5. Added loading states for better UX
 * 6. Added course filter in API call
 * 
 * Implementation Strategy:
 * - Add course selection dropdown at the top
 * - Filter semesters by selected course
 * - Chain loading: Course → Semesters → Subjects
 * - Maintain existing staff assignment logic
 */

// Add after existing imports in SubjectStaffAssignmentPage.tsx
import { ApiService } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

// Add to state management section:
const { user } = useAuth();
const [loadingCourses, setLoadingCourses] = useState(false);
const [courses, setCourses] = useState<any[]>([]);
const [selectedCourse, setSelectedCourse] = useState<string>('');

// Replace "Load semesters on mount" with "Load courses on mount":
useEffect(() => {
  loadCourses();
}, []);

// Add loadCourses function BEFORE loadSemesters:
const loadCourses = async () => {
  if (!user?.departmentId) {
    toast.error('Department information not found');
    return;
  }

  try {
    setLoadingCourses(true);
    console.log('🔍 Loading courses for department:', user.departmentId);
    
    // Fetch courses for HOD's department
    const coursesData = await ApiService.getCourses({
      departmentId: user.departmentId,
      isActive: true
    });
    
    console.log('🔍 Courses loaded:', coursesData);
    setCourses(coursesData || []);
    
    // Auto-select first course if available
    if (coursesData && coursesData.length > 0) {
      const firstCourse = coursesData[0];
      setSelectedCourse(firstCourse.id);
      // Load semesters for first course
      loadSemesters(firstCourse.id);
    }
  } catch (err: any) {
    console.error('🔍 Error loading courses:', err);
    toast.error('Failed to load courses');
  } finally {
    setLoadingCourses(false);
  }
};

// Update loadSemesters to accept courseId parameter:
const loadSemesters = async (courseId?: string) => {
  const courseToLoad = courseId || selectedCourse;
  
  if (!courseToLoad) {
    console.log('🔍 No course selected, skipping semester load');
    return;
  }

  try {
    setLoadingSemesters(true);
    console.log('🔍 Frontend: Loading semesters for course:', courseToLoad);
    
    // Pass courseId to the API
    const response = await SubjectStaffAssignmentService.getHODSemesters(courseToLoad);
    console.log('🔍 Frontend: Full Response:', JSON.stringify(response, null, 2));
    
    const responseData = response.data || response;
    console.log('🔍 Frontend: Response Data:', responseData);
    
    if (responseData && responseData.semesters) {
      console.log('🔍 Frontend: Setting semesters, count:', responseData.semesters.length);
      setSemesters(responseData.semesters);
      setDepartmentName(responseData.departmentName);

      // Auto-select first semester
      if (responseData.semesters.length > 0 && !selectedSemester) {
        const firstSemester = responseData.semesters[0];
        setSelectedSemester(firstSemester.semesterNumber);
        setAcademicYearId(firstSemester.contentMapSemDetailsId);
        console.log('🔍 Frontend: Selected first semester:', firstSemester.semesterNumber);
        
        // Auto-load subjects
        loadSubjects(firstSemester.semesterNumber, firstSemester.contentMapSemDetailsId);
      }
    } else {
      console.error('🔍 Frontend: No semesters in response!', responseData);
      setSemesters([]);
    }
  } catch (err: any) {
    console.error('🔍 Frontend: Error loading semesters:', err);
    toast.error(err.response?.data?.message || 'Failed to load semesters');
    setSemesters([]);
  } finally {
    setLoadingSemesters(false);
  }
};

// Add handleCourseChange function:
const handleCourseChange = (courseId: string) => {
  console.log('🔍 Course changed to:', courseId);
  setSelectedCourse(courseId);
  
  // Reset dependent states
  setSemesters([]);
  setSelectedSemester(null);
  setSubjects([]);
  setAcademicYearId('');
  
  // Load semesters for new course
  if (courseId) {
    loadSemesters(courseId);
  }
};

// Add Course Selection UI BEFORE Semester Selection:
{/* Course Selection */}
<div className="bg-white rounded-lg shadow p-6 mb-6">
  <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 1: Select Course</h2>
  
  {loadingCourses ? (
    <div className="flex justify-center items-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  ) : courses.length === 0 ? (
    <div className="text-center py-8">
      <AlertTriangle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
      <p className="text-gray-600">No courses found for your department</p>
    </div>
  ) : (
    <div className="max-w-md">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Course *
      </label>
      <select
        value={selectedCourse}
        onChange={(e) => handleCourseChange(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">-- Select a Course --</option>
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.name} ({course.code})
          </option>
        ))}
      </select>
      <p className="text-sm text-gray-500 mt-2">
        {courses.length} course{courses.length !== 1 ? 's' : ''} available
      </p>
    </div>
  )}
</div>

{/* Update Semester Selection title */}
<h2 className="text-xl font-semibold text-gray-900 mb-4">
  Step 2: Select Semester
  {!selectedCourse && <span className="text-sm text-gray-500 ml-2">(Select a course first)</span>}
</h2>

// Add condition to show semesters only when course is selected:
{selectedCourse && (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
    {/* ... existing semester cards ... */}
  </div>
)}

{!selectedCourse && (
  <div className="text-center py-12 bg-gray-50 rounded-lg">
    <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
    <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Course</h3>
    <p className="text-gray-600">
      Please select a course from the dropdown above to view semesters
    </p>
  </div>
)}
