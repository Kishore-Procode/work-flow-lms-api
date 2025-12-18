import { pool } from '../../../config/database';
import { academicYearRepository } from '../../academic-year/repositories/academic-year.repository';
import { DistanceService } from '../../distance/services/distance.service';
export interface PhotoRestrictionResult {
  canTakePhoto: boolean;
  reason?: string;
  nextAllowedDate?: Date;
  academicYearInfo?: {
    yearName: string;
    startYear: number;
    endYear: number;
  };
  currentSemester?: number | string;
  nextSemester?: number | string;
  totalSemesters?: number;
  isCompleted?: boolean;
}

export class PhotoRestrictionService {
  /**
   * Get ordinal suffix for a number (1st, 2nd, 3rd, 4th, etc.)
   */
  private getOrdinalSuffix(num: number): string {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) {
      return num + 'st';
    }
    if (j === 2 && k !== 12) {
      return num + 'nd';
    }
    if (j === 3 && k !== 13) {
      return num + 'rd';
    }
    return num + 'th';
  }

  /**
   * Get the current academic year cycle (June to March)
   * Returns the academic year period for the current date
   */
  private getCurrentAcademicYearCycle(): { startDate: Date; endDate: Date; academicYear: string } {
    const now = new Date();
    const currentYear = now.getFullYear(); // Adjusted year for academic calculation
    const currentMonth = now.getMonth(); // 0-based (0 = January, 5 = June, 2 = March)

    let startYear: number;
    let endYear: number;

    if (currentMonth >= 5) { // June (5) to December (11)
      startYear = currentYear;
      endYear = currentYear + 1;
    } else { // January (0) to May (4)
      startYear = currentYear - 1;
      endYear = currentYear;
    }

    const startDate = new Date(startYear, 5, 1); // June 1st
    const endDate = new Date(endYear, 2, 31); // March 31st

    return {
      startDate,
      endDate,
      academicYear: `${startYear}-${endYear}`
    };
  }

  /**
   * Check if student has already taken a photo in the current semester
   */
  private async hasPhotoInCurrentCycle(studentId: string, resourceId: string): Promise<boolean> {
    const { startDate, endDate } = this.getCurrentSemesterCycle();

    const query = `
      SELECT COUNT(*) as photo_count
      FROM resource_media
      WHERE student_id = $1
        AND resource_id = $2
        AND upload_date >= $3
        AND upload_date <= $4
    `;

    const result = await pool.query(query, [studentId, resourceId, startDate, endDate]);
    const photoCount = parseInt(result.rows[0].photo_count);

    return photoCount > 0;
  }

  /**
   * Get current semester cycle dates
   */
  private getCurrentSemesterCycle(): { startDate: Date; endDate: Date } {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-based

    let startDate: Date;
    let endDate: Date;

    if (currentMonth >= 5 && currentMonth <= 10) { // June to November (1st semester)
      startDate = new Date(currentYear, 5, 1); // June 1st
      endDate = new Date(currentYear, 10, 30); // November 30th
    } else if (currentMonth >= 11) { // December (2nd semester)
      startDate = new Date(currentYear, 11, 1); // December 1st
      endDate = new Date(currentYear + 1, 4, 31); // May 31st next year
    } else { // January to May (2nd semester)
      startDate = new Date(currentYear - 1, 11, 1); // December 1st previous year
      endDate = new Date(currentYear, 4, 31); // May 31st this year
    }

    return { startDate, endDate };
  }

  /**
   * Parse academic year name (e.g., "2025 - 2029") to get start and end years
   */
  private parseAcademicYearName(yearName: string): { startYear: number; endYear: number } | null {
    const match = yearName.match(/^(\d{4})\s*-\s*(\d{4})$/);
    if (!match) {
      return null;
    }

    return {
      startYear: parseInt(match[1]),
      endYear: parseInt(match[2])
    };
  }
  /**
 * Get total semesters based on the academic year duration
 */
  private getTotalSemesters(startYear: number, endYear: number): number {
    const durationYears = endYear - startYear; // e.g. 2000 - 2004 = 4 years
    if (durationYears === 4) return 8; // 4-year course → 8 semesters
    if (durationYears === 3) return 6; // 3-year course → 6 semesters
    return durationYears * 2; // fallback (2 semesters per year)
  }

  /**
   * Check if current date is within the student's enrolled academic year period
   */
  private isWithinEnrolledPeriod(academicYearName: string): boolean {
    const parsed = this.parseAcademicYearName(academicYearName);
    if (!parsed) {
      return false;
    }

    const { startYear, endYear } = parsed;
    const now = new Date();
    const currentYear = now.getFullYear(); // Adjusted year for academic calculation
    const currentMonth = now.getMonth(); // 0-based

    // For academic year "2025 - 2029", student can take photos from:
    // June 2025 to March 2030 (until March of the year after end year)
    const allowedStartDate = new Date(startYear, 5, 1); // June 1st of start year
    const allowedEndDate = new Date(endYear + 1, 2, 31); // March 31st of year after end year

    return now >= allowedStartDate && now <= allowedEndDate;
  }

  /**
   * Get the next allowed date for taking a photo
   */
  private getCurrentSemester(academicYearName: string, currentDate?: Date): { semester: number; year: number } | null {
    if (!academicYearName || !academicYearName.includes(' - ')) {
      return null;
    }

    try {
      const [startYear, endYear] = academicYearName.split(' - ').map(year => parseInt(year.trim()));
      const dateToCheck = currentDate || new Date();
      const checkYear = dateToCheck.getFullYear();
      const checkMonth = dateToCheck.getMonth(); // 0-based (0 = January)

      // Calculate which academic year we're in
      let academicStartYear: number;
      if (checkMonth >= 5) { // June (month 5) or later
        academicStartYear = checkYear;
      } else { // January to May
        academicStartYear = checkYear - 1;
      }

      // Calculate which year of the course (1st year, 2nd year, etc.)
      const yearInCourse = academicStartYear - startYear + 1;
      const totalYears = endYear - startYear;

      if (yearInCourse < 1 || yearInCourse > totalYears) {
        return null; // Outside course duration
      }

      // Determine semester within the year
      let semesterInYear: number;
      if (checkMonth >= 5 && checkMonth <= 10) { // June to November
        semesterInYear = 1; // 1st semester of the academic year
      } else { // December to May
        semesterInYear = 2; // 2nd semester of the academic year
      }

      // Calculate overall semester number (1-8 for 4-year course)
      const overallSemester = (yearInCourse - 1) * 2 + semesterInYear;

      return {
        semester: overallSemester,
        year: yearInCourse
      };
    } catch (error) {
      console.error('Error calculating current semester:', error);
      return null;
    }
  }

  private getNextAllowedDate(): Date {
    const now = new Date();
    const currentYear = now.getFullYear(); // Adjusted year for academic calculation
    const currentMonth = now.getMonth();

    // Semester system: 1st Sem (Jun-Nov), 2nd Sem (Dec-May)
    if (currentMonth >= 5 && currentMonth <= 10) { // June to November (1st semester)
      return new Date(currentYear, 11, 1); // December 1st (start of 2nd semester)
    } else if (currentMonth >= 11) { // December (2nd semester)
      return new Date(currentYear + 1, 5, 1); // June 1st next year (start of next 1st semester)
    } else { // January to May (2nd semester)
      return new Date(currentYear, 5, 1); // June 1st this year (start of next 1st semester)
    }
  }

  /**
   * Check if student can take a photo
   */
  async canStudentTakePhoto(studentId: string, resourceId: string, caption?: string): Promise<PhotoRestrictionResult> {
    try {
      const canDownload = await this.canDownloadCertificate(studentId, resourceId);
      if (canDownload) {
        return {
          canTakePhoto: false,
          isCompleted: true,
          reason: "Congratulations! You have successfully uploaded all photos for all semesters.",
        };
      }
      // Get student's academic year information
      console.log('Caption received:', caption);
      const coordinates1 = caption?.slice(-21, -1) || null;
      const studentQuery = `
        SELECT 
          u.academic_year_id,
          ay.year_name,
          ay.course_id
        FROM users u
        LEFT JOIN academic_years ay ON u.academic_year_id = ay.id
        WHERE u.id = $1
      `;

      const studentResult = await pool.query(studentQuery, [studentId]);

      if (studentResult.rows.length === 0) {
        return {
          canTakePhoto: false,
          reason: 'Student not found'
        };
      }

      const student = studentResult.rows[0];

      if (!student.academic_year_id || !student.year_name) {
        return {
          canTakePhoto: false,
          reason: 'Student is not enrolled in any academic year'
        };
      }

      const academicYearInfo = this.parseAcademicYearName(student.year_name);
      if (!academicYearInfo) {
        return {
          canTakePhoto: false,
          reason: 'Invalid academic year format'
        };
      }

      const totalSemesters = this.getTotalSemesters(
      academicYearInfo.startYear,
      academicYearInfo.endYear
    );

      const currentSemesterInfo = this.getCurrentSemester(student.year_name);
      const currentSemesterNum = currentSemesterInfo ? currentSemesterInfo.semester : null;

            if (currentSemesterInfo && currentSemesterInfo.semester > totalSemesters) {
        return {
          canTakePhoto: false,
          reason: `🎉 You have successfully completed all ${totalSemesters} semesters for your batch (${student.year_name}).`,
          academicYearInfo: {
            yearName: student.year_name,
            startYear: academicYearInfo.startYear,
            endYear: academicYearInfo.endYear
          },
          currentSemester: totalSemesters,
          nextSemester: 'Completed',
          totalSemesters
        };
      }

      // Check if current date is within enrolled period
      if (!this.isWithinEnrolledPeriod(student.year_name)) {
        return {
          canTakePhoto: false,
          reason: `You can only take photos during your enrolled academic year period (${student.year_name})`,
          academicYearInfo: {
            yearName: student.year_name,
            startYear: academicYearInfo.startYear,
            endYear: academicYearInfo.endYear
          },
          totalSemesters
        };
      }

      // Check if student has completed photos for all previous semesters
      if (currentSemesterInfo) {
        const currentSemesterNum = currentSemesterInfo.semester;
        const startYear = academicYearInfo.startYear;

        for (let sem = 1; sem < currentSemesterNum; sem++) {
          // Calculate year in course and semester in year
          const yearInCourse = Math.floor((sem - 1) / 2) + 1;
          const semInYear = ((sem - 1) % 2) + 1;
          const academicYear = startYear + yearInCourse - 1;

          let startMonth: number, endMonth: number, endYear: number;

          if (semInYear === 1) {
            startMonth = 5; // June
            endMonth = 10; // November
            endYear = academicYear;
          } else {
            startMonth = 11; // December
            endMonth = 4; // May
            endYear = academicYear + 1;
          }

          const startDate = new Date(academicYear, startMonth, 1);
          const endDate = new Date(endYear, endMonth + 1, 0); // Last day of endMonth

          // Check if photo exists for this previous semester
          const query = `
            SELECT COUNT(*) as count
            FROM resource_media
            WHERE student_id = $1
              AND resource_id = $2
              AND upload_date >= $3
              AND upload_date <= $4
          `;

          const result = await pool.query(query, [studentId, resourceId, startDate, endDate]);
          const photoCount = parseInt(result.rows[0].count);

          if (photoCount === 0) {
            return {
              canTakePhoto: false,
              reason: `You must complete photo uploads for all previous semesters before uploading in the current semester. Missing photo for ${this.getOrdinalSuffix(sem)} semester.`,
              academicYearInfo: {
                yearName: student.year_name,
                startYear: academicYearInfo.startYear,
                endYear: academicYearInfo.endYear
              },
              totalSemesters
            };
          }
        }
      }

      // Check if student has already taken a photo in current academic cycle
      const hasPhoto = await this.hasPhotoInCurrentCycle(studentId, resourceId);

      if (hasPhoto) {
        const nextAllowedDate = this.getNextAllowedDate();
        const nextSemesterNum = currentSemesterInfo ? currentSemesterInfo.semester + 1 : null;

        return {
          canTakePhoto: false,
          reason: `You have already uploaded a photo for the ${this.getOrdinalSuffix(currentSemesterNum!)} semester. The next photo can be uploaded in ${this.getOrdinalSuffix(nextSemesterNum!)} semester.`,
          nextAllowedDate,
          academicYearInfo: {
            yearName: student.year_name,
            startYear: academicYearInfo.startYear,
            endYear: academicYearInfo.endYear
          },
          currentSemester: currentSemesterNum,
          nextSemester: nextSemesterNum,
          totalSemesters
        };
      }

      console.log('Coordinates from caption:', coordinates1);
      if (coordinates1 !== null) {
        const distanceQuery = `
        SELECT 
          substring(caption, length(caption) - 20, 20) AS coordinates 
        FROM public.resource_media 
        WHERE student_id = $1 order by upload_date limit 1
      `;

        const coordinate2 = await pool.query(distanceQuery, [studentId]);
        console.log('Last photo coordinates from DB:', coordinate2);
        if (!(coordinate2.rows.length === 0)) {
          const distance = await DistanceService.calculateDistanceFromCoordinates(
            {
              latitude: parseFloat(coordinates1.split(',')[0]),
              longitude: parseFloat(coordinates1.split(', ')[1])
            },
            {
              latitude: parseFloat(coordinate2.rows[0].coordinates.split(',')[0]),
              longitude: parseFloat(coordinate2.rows[0].coordinates.split(', ')[1])
            }
          );

          console.log('Distance in meters:', distance.meters);

          if (distance.meters > 25) {
            return {
              canTakePhoto: false,
              reason: 'You are more than 25 meters away from your last photo location. Please move closer to take a new photo.'
            };
          }
        }
      }
      // All checks passed
      return {
        canTakePhoto: true,
        academicYearInfo: {
          yearName: student.year_name,
          startYear: academicYearInfo.startYear,
          endYear: academicYearInfo.endYear
        },
        currentSemester: currentSemesterNum,
        totalSemesters
      };

    } catch (error) {
      console.error('Error checking photo restrictions:', error);
      return {
        canTakePhoto: false,
        reason: 'Error checking photo restrictions. Please try again.'
      };
    }
  }

  /**
   * Check if student can download certificate (has uploaded photos for all 8 semesters)
   */
  async canDownloadCertificate(studentId: string, resourceId: string): Promise<boolean> {
    try {
      // Get student's academic year information
      const studentQuery = `
        SELECT
          u.academic_year_id,
          ay.year_name
        FROM users u
        LEFT JOIN academic_years ay ON u.academic_year_id = ay.id
        WHERE u.id = $1
      `;

      const studentResult = await pool.query(studentQuery, [studentId]);

      if (studentResult.rows.length === 0) {
        return false;
      }

      const student = studentResult.rows[0];

      if (!student.academic_year_id || !student.year_name) {
        return false;
      }

      const parsed = this.parseAcademicYearName(student.year_name);
      if (!parsed) {
        return false;
      }

      const startYear = parsed.startYear;

      // Check each of the 8 semesters
      for (let sem = 1; sem <= 8; sem++) {
        // Calculate year in course and semester in year
        const yearInCourse = Math.floor((sem - 1) / 2) + 1;
        const semInYear = ((sem - 1) % 2) + 1;
        const academicYear = startYear + yearInCourse - 1;

        let startMonth: number, endMonth: number, endYear: number;

        if (semInYear === 1) {
          // 1st semester: June to November
          startMonth = 5; // June
          endMonth = 10; // November
          endYear = academicYear;
        } else {
          // 2nd semester: December to May
          startMonth = 11; // December
          endMonth = 4; // May
          endYear = academicYear + 1;
        }

        const startDate = new Date(academicYear, startMonth, 1);
        const endDate = new Date(endYear, endMonth + 1, 0); // Last day of endMonth

        // Check if photo exists for this semester
        const query = `
          SELECT COUNT(*) as count
          FROM resource_media
          WHERE student_id = $1
            AND resource_id = $2
            AND upload_date >= $3
            AND upload_date <= $4
        `;

        const result = await pool.query(query, [studentId, resourceId, startDate, endDate]);
        const photoCount = parseInt(result.rows[0].count);

        if (photoCount === 0) {
          return false;
        }
      }

      // All semesters have photos
      return true;
    } catch (error) {
      console.error('Error checking certificate eligibility:', error);
      return false;
    }
  }

  /**
   * Get student's photo history for current academic year
   */
  async getStudentPhotoHistory(studentId: string, resourceId: string): Promise<any[]> {
    const { startDate, endDate } = this.getCurrentAcademicYearCycle();

    const query = `
      SELECT
        ti.*,
        t.category,
        t.resource_code
      FROM resource_media ti
      LEFT JOIN resources t ON ti.resource_id = t.id
      WHERE ti.student_id = $1
        AND ti.resource_id = $2
        AND ti.upload_date >= $3
        AND ti.upload_date <= $4
      ORDER BY ti.upload_date DESC
    `;

    const result = await pool.query(query, [studentId, resourceId, startDate, endDate]);
    return result.rows;
  }
}

export const photoRestrictionService = new PhotoRestrictionService();