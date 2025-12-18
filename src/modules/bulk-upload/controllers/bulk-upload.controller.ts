import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import csv from 'csv-parser';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { collegeRepository } from '../../college/repositories/college.repository';
import { userRepository } from '../../user/repositories/user.repository';
import { invitationRepository } from '../../invitation/repositories/invitation.repository';
import { departmentRepository } from '../../department/repositories/department.repository';
import { courseRepository } from '../../course/repositories/course.repository';
import { sectionRepository } from '../../section/repositories/section.repository';
import { academicYearRepository } from '../../academic-year/repositories/academic-year.repository';
import { emailService } from '../../../utils/email.service';
import { CollegeStatus, UserRole, UserStatus } from '../../../types';

// Configure multer for CSV file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../../uploads/csv');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const csvFileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed!'));
  }
};

export const csvUpload = multer({
  storage,
  fileFilter: csvFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

interface CollegePrincipalData {
  collegeName: string;
  collegeAddress: string;
  collegePhone: string;
  collegeEmail: string;
  collegeWebsite?: string;
  collegeEstablished?: string;
  principalName?: string;
  principalEmail?: string;
  principalPhone?: string;
}

interface CollegeData {
  collegeName: string;
  collegeAddress: string;
  emailId: string;
  phoneNumber: string;
  website?: string;
  establishedYear?: string;
}

interface StaffHODData {
  name: string;
  email: string;
  phone: string;
  role: 'staff' | 'hod';
  departmentName: string;
  departmentCode?: string;
  subject?: string;
  designation?: string;
}

interface StudentData {
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  rollNumber: string;
  departmentName: string;
  courseName: string;
  yearOfStudy: string;
  sectionName: string;
  password?: string;
  guardianName?: string;
  guardianPhone?: string;
  address?: string;
}

/**
 * Upload colleges only via CSV (without principal information)
 * Expected CSV format:
 * College Name,College Address,Email ID,Phone Number,Website,Established Year
 */
export const uploadColleges = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only admin can upload colleges
    if (req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Only administrators can upload colleges',
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No CSV file provided',
      });
      return;
    }

    const results: CollegeData[] = [];
    const errors: string[] = [];
    const successfulUploads: any[] = [];

    // Parse CSV file
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(req.file!.path)
        .pipe(csv())
        .on('data', data => {
          // Support both Excel format and programmatic format
          const collegeName = data['College Name'] || data.collegeName;
          const collegeAddress = data['College Address'] || data.collegeAddress;
          const emailId = data['Email ID'] || data.emailId || data.email;
          const phoneNumber = data['Phone Number'] || data.phoneNumber || data.phone;
          const website = data['Website'] || data.website;
          const establishedYear = data['Established Year'] || data.establishedYear || data.established;

          // Validate required fields are not null/empty
          if (!collegeName || collegeName.trim() === '') {
            errors.push(`Row ${results.length + 1}: College Name is required and cannot be empty`);
            return;
          }

          if (!collegeAddress || collegeAddress.trim() === '') {
            errors.push(`Row ${results.length + 1}: College Address is required and cannot be empty`);
            return;
          }

          if (!emailId || emailId.trim() === '') {
            errors.push(`Row ${results.length + 1}: Email ID is required and cannot be empty`);
            return;
          }

          if (!phoneNumber || phoneNumber.trim() === '') {
            errors.push(`Row ${results.length + 1}: Phone Number is required and cannot be empty`);
            return;
          }

          // Validate phone number length (at least 10 digits)
          const cleanPhoneNumber = phoneNumber.replace(/\D/g, ''); // Remove non-digits
          if (cleanPhoneNumber.length < 10) {
            errors.push(
              `Row ${results.length + 1}: Phone Number must have at least 10 digits. Current: "${phoneNumber}"`
            );
            return;
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(emailId.trim())) {
            errors.push(`Row ${results.length + 1}: Invalid email format for "${emailId}"`);
            return;
          }

          results.push({
            collegeName: collegeName.trim(),
            collegeAddress: collegeAddress.trim(),
            emailId: emailId.trim().toLowerCase(),
            phoneNumber: phoneNumber.trim(),
            website: website?.trim() || '',
            establishedYear: establishedYear?.trim() || '',
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Check for duplicate names and emails within the upload batch
    const nameSet = new Set<string>();
    const emailSet = new Set<string>();

    for (const item of results) {
      const lowerName = item.collegeName.toLowerCase();
      const lowerEmail = item.emailId.toLowerCase();

      if (nameSet.has(lowerName)) {
        errors.push(`Duplicate college name "${item.collegeName}" found in upload file`);
      } else {
        nameSet.add(lowerName);
      }

      if (emailSet.has(lowerEmail)) {
        errors.push(`Duplicate email "${item.emailId}" found in upload file`);
      } else {
        emailSet.add(lowerEmail);
      }
    }

    // If there are duplicate errors, return early
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
        summary: {
          totalProcessed: 0,
          successCount: 0,
          errorCount: errors.length,
        },
      });
    }

    // Process each college
    for (const item of results) {
      try {
        // Check if college name already exists in database
        const existingCollegeByName = await collegeRepository.findByName(item.collegeName);
        if (existingCollegeByName) {
          errors.push(`College with name "${item.collegeName}" already exists in database`);
          continue;
        }

        // Check if college email already exists in database
        const existingCollegeByEmail = await collegeRepository.findByEmail(item.emailId);
        if (existingCollegeByEmail) {
          errors.push(`College with email "${item.emailId}" already exists in database`);
          continue;
        }

        // Create college
        const collegeData = {
          name: item.collegeName,
          address: item.collegeAddress,
          phone: item.phoneNumber,
          email: item.emailId,
          website: item.website || undefined,
          established: item.establishedYear || undefined,
          status: 'active' as CollegeStatus,
        };

        const newCollege = await collegeRepository.createCollege(collegeData);

        successfulUploads.push({
          college: newCollege,
          name: item.collegeName,
          email: item.emailId,
        });
      } catch (error) {
        console.error('Error processing college:', error);
        errors.push(
          `Failed to process ${item.collegeName}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (cleanupError) {
      console.error('Failed to clean up uploaded file:', cleanupError);
    }

    res.status(200).json({
      success: true,
      message: 'College upload completed',
      data: {
        totalProcessed: results.length,
        successfulUploads: successfulUploads.length,
        invitationsSent: 0, // No invitations for college-only upload
        errors: errors.length,
        details: {
          successful: successfulUploads,
          invitations: [],
          errors,
        },
      },
    });
  } catch (error) {
    console.error('College upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process college upload',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Upload colleges with principal details via CSV
 * Expected CSV format:
 * collegeName,collegeAddress,collegePhone,collegeEmail,collegeWebsite,collegeEstablished,principalName,principalEmail,principalPhone
 */
export const uploadCollegesWithPrincipals = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only admin can upload colleges
    if (req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Only administrators can upload colleges',
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No CSV file provided',
      });
      return;
    }

    const results: CollegePrincipalData[] = [];
    const errors: string[] = [];
    const successfulUploads: any[] = [];
    const invitationsSent: any[] = [];

    // Parse CSV file
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(req.file!.path)
        .pipe(csv())
        .on('data', data => {
          // Validate required fields
          if (
            !data.collegeName ||
            !data.collegeAddress ||
            !data.collegePhone ||
            !data.collegeEmail ||
            !data.principalName ||
            !data.principalEmail ||
            !data.principalPhone
          ) {
            errors.push(`Row with college "${data.collegeName || 'Unknown'}" is missing required fields`);
            return;
          }

          results.push({
            collegeName: data.collegeName.trim(),
            collegeAddress: data.collegeAddress.trim(),
            collegePhone: data.collegePhone.trim(),
            collegeEmail: data.collegeEmail.trim().toLowerCase(),
            collegeWebsite: data.collegeWebsite?.trim() || '',
            collegeEstablished: data.collegeEstablished?.trim() || '',
            principalName: data.principalName.trim(),
            principalEmail: data.principalEmail.trim().toLowerCase(),
            principalPhone: data.principalPhone.trim(),
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Process each college-principal pair
    for (const item of results) {
      try {
        // Check if college email already exists
        const existingCollege = await collegeRepository.findByEmail(item.collegeEmail);
        if (existingCollege) {
          errors.push(`College with email ${item.collegeEmail} already exists`);
          continue;
        }

        // Check if principal email already exists
        const existingUser = await userRepository.findByEmail(item.principalEmail);
        if (existingUser) {
          errors.push(`Principal with email ${item.principalEmail} already exists`);
          continue;
        }

        // Create college
        const collegeData = {
          name: item.collegeName,
          address: item.collegeAddress,
          phone: item.collegePhone,
          email: item.collegeEmail,
          website: item.collegeWebsite || undefined,
          established: item.collegeEstablished || undefined,
          status: 'active' as CollegeStatus,
        };

        const newCollege = await collegeRepository.createCollege(collegeData);

        // Create invitation for principal
        const invitationToken =
          'inv-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

        const invitation = await invitationRepository.createInvitation({
          email: item.principalEmail,
          role: 'principal',
          sentBy: req.user.id,
          collegeId: newCollege.id,
          departmentId: null,
          invitationToken,
          expiresAt,
          status: 'pending',
        });

        // Send email invitation with temporary password
        try {
          const temporaryPassword = 'TempPassword@123'; // Standard temporary password
          const emailOptions = emailService.generatePrincipalInvitationEmail(
            item.principalName,
            item.principalEmail,
            item.collegeName,
            invitationToken,
            temporaryPassword
          );

          await emailService.sendEmail(emailOptions);

          invitationsSent.push({
            principalName: item.principalName,
            principalEmail: item.principalEmail,
            collegeName: item.collegeName,
          });
        } catch (emailError) {
          console.error('Failed to send invitation email:', emailError);
          errors.push(`Failed to send invitation email to ${item.principalEmail}`);
        }

        successfulUploads.push({
          college: newCollege,
          principalName: item.principalName,
          principalEmail: item.principalEmail,
          invitationSent: true,
        });
      } catch (error) {
        console.error('Error processing college-principal:', error);
        errors.push(
          `Failed to process ${item.collegeName}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (cleanupError) {
      console.error('Failed to clean up uploaded file:', cleanupError);
    }

    res.status(200).json({
      success: true,
      message: 'Bulk upload completed',
      data: {
        totalProcessed: results.length,
        successfulUploads: successfulUploads.length,
        invitationsSent: invitationsSent.length,
        errors: errors.length,
        details: {
          successful: successfulUploads,
          invitations: invitationsSent,
          errors: errors,
        },
      },
    });
  } catch (error) {
    console.error('Bulk upload error:', error);

    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Failed to clean up uploaded file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to process bulk upload',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get college bulk upload template (Excel format)
 */
export const getCollegeUploadTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const csvTemplate = [
      'College Name,College Address,Email ID,Phone Number,Website,Established Year',
      'Sample Engineering College,"123 Education Sresourcet, City, State 12345",info@samplecollege.edu,+1-555-0123,https://samplecollege.edu,1985',
      'Another Technical College,"456 Learning Avenue, Town, State 67890",contact@anothercollege.edu,+1-555-0125,https://anothercollege.edu,1990',
      'Modern University,"789 Knowledge Boulevard, Metro, State 54321",admin@modernuni.edu,+1-555-0127,https://modernuni.edu,2000',
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="college_upload_template.csv"');
    res.send(csvTemplate);
  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template',
    });
  }
};

/**
 * Get bulk upload template (with principal information)
 */
export const getBulkUploadTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const csvTemplate = [
      'collegeName,collegeAddress,collegePhone,collegeEmail,collegeWebsite,collegeEstablished,principalName,principalEmail,principalPhone',
      'Sample College,123 Education St, City, State 12345,+1-555-0123,info@samplecollege.edu,https://samplecollege.edu,1985,Dr. John Principal,principal@samplecollege.edu,+1-555-0124',
      'Another College,456 Learning Ave, Town, State 67890,+1-555-0125,contact@anothercollege.edu,https://anothercollege.edu,1990,Dr. Jane Principal,jane.principal@anothercollege.edu,+1-555-0126',
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="college_upload_template.csv"');
    res.send(csvTemplate);
  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template',
    });
  }
};

/**
 * Upload staff and HODs via CSV (for principals)
 * Expected CSV format:
 * name,email,phone,role,departmentName,departmentCode,subject,designation
 */
export const uploadStaffAndHODs = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only principals can upload staff/HODs
    if (req.user.role !== 'principal') {
      res.status(403).json({
        success: false,
        message: 'Only principals can upload staff and HODs',
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No CSV file provided',
      });
      return;
    }

    const results: StaffHODData[] = [];
    const errors: string[] = [];
    const successfulUploads: any[] = [];
    const invitationsSent: any[] = [];

    // Parse CSV file
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(req.file!.path)
        .pipe(csv())
        .on('data', data => {
          // Validate required fields
          if (!data.name || !data.email || !data.phone || !data.role || !data.departmentName) {
            errors.push(`Row with name "${data.name || 'Unknown'}" is missing required fields`);
            return;
          }

          // Validate role
          if (!['staff', 'hod'].includes(data.role.toLowerCase())) {
            errors.push(`Invalid role "${data.role}" for ${data.name}. Must be 'staff' or 'hod'`);
            return;
          }

          results.push({
            name: data.name.trim(),
            email: data.email.trim().toLowerCase(),
            phone: data.phone.trim(),
            role: data.role.toLowerCase() as 'staff' | 'hod',
            departmentName: data.departmentName.trim(),
            departmentCode: data.departmentCode?.trim() || '',
            subject: data.subject?.trim() || '',
            designation: data.designation?.trim() || '',
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Get principal's college
    const principalCollegeId = req.user.collegeId;
    if (!principalCollegeId) {
      res.status(400).json({
        success: false,
        message: 'Principal is not assigned to any college',
      });
      return;
    }

    // Process each staff/HOD
    for (const item of results) {
      try {
        // Check if user email already exists
        const existingUser = await userRepository.findByEmail(item.email);
        if (existingUser) {
          errors.push(`User with email ${item.email} already exists`);
          continue;
        }

        // Find or create department
        let department = await departmentRepository.findByNameAndCollege(item.departmentName, principalCollegeId);

        if (!department) {
          // Create department if it doesn't exist
          try {
            const departmentCode = item.departmentCode || item.departmentName.substring(0, 4).toUpperCase();
            department = await departmentRepository.createDepartment({
              name: item.departmentName,
              code: departmentCode,
              collegeId: principalCollegeId,
              established: new Date().getFullYear().toString(),
            });
          } catch (deptError) {
            // If department creation fails due to duplicate code, try to find by code
            if (deptError.message.includes('duplicate key')) {
              const departmentCode = item.departmentCode || item.departmentName.substring(0, 4).toUpperCase();
              department = await departmentRepository.findByCodeAndCollege(departmentCode, principalCollegeId);
              if (!department) {
                throw new Error(
                  `Department creation failed and could not find existing department: ${deptError.message}`
                );
              }
            } else {
              throw deptError;
            }
          }
        }

        // Create invitation
        const invitationToken =
          'inv-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

        const invitation = await invitationRepository.createInvitation({
          email: item.email,
          role: item.role,
          sentBy: req.user.id,
          collegeId: principalCollegeId,
          departmentId: department.id,
          invitationToken,
          expiresAt,
          status: 'pending',
        });

        // Send email invitation with temporary password
        try {
          const temporaryPassword = 'TempPassword@123'; // Standard temporary password
          const emailOptions = emailService.generateStaffHODInvitationEmail(
            item.name,
            item.email,
            item.role,
            item.departmentName,
            req.user.name || 'Principal',
            invitationToken,
            temporaryPassword
          );

          await emailService.sendEmail(emailOptions);

          invitationsSent.push({
            name: item.name,
            email: item.email,
            role: item.role,
            departmentName: item.departmentName,
          });
        } catch (emailError) {
          console.error('Failed to send invitation email:', emailError);
          errors.push(`Failed to send invitation email to ${item.email}`);
        }

        successfulUploads.push({
          name: item.name,
          email: item.email,
          role: item.role,
          department: department,
          invitationSent: true,
        });
      } catch (error) {
        console.error('Error processing staff/HOD:', error);
        errors.push(`Failed to process ${item.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (cleanupError) {
      console.error('Failed to clean up uploaded file:', cleanupError);
    }

    res.status(200).json({
      success: true,
      message: 'Staff/HOD bulk upload completed',
      data: {
        totalProcessed: results.length,
        successfulUploads: successfulUploads.length,
        invitationsSent: invitationsSent.length,
        errors: errors.length,
        details: {
          successful: successfulUploads,
          invitations: invitationsSent,
          errors: errors,
        },
      },
    });
  } catch (error) {
    console.error('Staff/HOD bulk upload error:', error);

    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Failed to clean up uploaded file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to process staff/HOD bulk upload',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get staff/HOD bulk upload template
 */
export const getStaffHODUploadTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const csvTemplate = [
      'name,email,phone,role,departmentName,departmentCode,subject,designation',
      'Dr. John Staff,john.staff@college.edu,+1-555-0123,staff,Computer Science,CSE,Data Structures,Assistant Professor',
      'Dr. Jane HOD,jane.hod@college.edu,+1-555-0124,hod,Computer Science,CSE,Algorithms,Professor & HOD',
      'Prof. Mike Staff,mike.staff@college.edu,+1-555-0125,staff,Electronics,ECE,Digital Circuits,Associate Professor',
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="staff_hod_upload_template.csv"');
    res.send(csvTemplate);
  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template',
    });
  }
};

/**
 * Upload students via CSV (for staff and HODs)
 * Expected CSV format:
 * First Name,Last Name,Email Address,Phone Number,Password,Registration Number,Department,Course,Year of Study,Section
 */
export const uploadStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only staff and HODs can upload students
    if (!['staff', 'hod'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Only staff and HODs can upload students',
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No CSV file provided',
      });
      return;
    }

    const results: StudentData[] = [];
    const errors: string[] = [];
    const successfulUploads: any[] = [];
    const invitationsSent: any[] = [];

    // Parse CSV file
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(req.file!.path)
        .pipe(csv())
        .on('data', data => {
          // Map Excel column names to our field names
          const firstName = data['First Name'] || data.firstName;
          const lastName = data['Last Name'] || data.lastName;
          const email = data['Email Address'] || data.email;
          const phone = data['Phone Number'] || data.phone;
          const password = data['Password'] || data.password;
          const rollNumber = data['Registration Number'] || data.rollNumber;
          const departmentName = data['Department'] || data.departmentName;
          const courseName = data['Course'] || data.courseName;
          const yearOfStudy = data['Batch'] || data.yearOfStudy;
          const sectionName = data['Section'] || data.sectionName;

          // Validate required fields
          if (
            !firstName ||
            !lastName ||
            !email ||
            !phone ||
            !rollNumber ||
            !departmentName ||
            !courseName ||
            !yearOfStudy ||
            !sectionName
          ) {
            errors.push(`Row with student "${firstName || 'Unknown'} ${lastName || ''}" is missing required fields`);
            return;
          }

          // Validate email format
          if (!email.includes('@') || !email.includes('.')) {
            errors.push(`Invalid email format for student ${firstName} ${lastName}: ${email}`);
            return;
          }

          results.push({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            name: `${firstName.trim()} ${lastName.trim()}`,
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            rollNumber: rollNumber.trim().toUpperCase(),
            departmentName: departmentName.trim(),
            courseName: courseName.trim(),
            yearOfStudy: yearOfStudy.trim(),
            sectionName: sectionName.trim(),
            password: password?.trim() || 'TempPassword@123',
            guardianName: '',
            guardianPhone: '',
            address: '',
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Get staff/HOD's college and department
    const staffCollegeId = req.user.collegeId;
    const staffDepartmentId = req.user.departmentId;

    if (!staffCollegeId) {
      res.status(400).json({
        success: false,
        message: 'Staff member is not assigned to any college',
      });
      return;
    }

    // Process each student
    for (const item of results) {
      try {
        // Check if student email already exists
        const existingUser = await userRepository.findByEmail(item.email);
        if (existingUser) {
          errors.push(`Student with email ${item.email} already exists`);
          continue;
        }

        // Check if roll number already exists in the same college
        const existingStudent = await userRepository.findByRollNumberAndCollege(item.rollNumber, staffCollegeId);
        if (existingStudent) {
          errors.push(`Student with roll number ${item.rollNumber} already exists in this college`);
          continue;
        }

        // Find department by name and college
        const department = await departmentRepository.findByNameAndCollege(item.departmentName, staffCollegeId);
        if (!department) {
          errors.push(`Department "${item.departmentName}" not found in college`);
          continue;
        }

        // For staff members, ensure they can only upload students for their own department
        if (req.user.role === 'staff' && staffDepartmentId && department.id !== staffDepartmentId) {
          errors.push(
            `Staff can only upload students for their own department. ${item.name} belongs to ${item.departmentName}`
          );
          continue;
        }

        // Find course by name and department
        const course = await courseRepository.findByNameAndDepartment(item.courseName, department.id);
        if (!course) {
          errors.push(`Course "${item.courseName}" not found in department "${item.departmentName}"`);
          continue;
        }

        // Find academic year by name and course
        const academicYear = await academicYearRepository.findByYearNameAndCourse(item.yearOfStudy, course.id);
        if (!academicYear) {
          console.log({ yearOfStudy: item.yearOfStudy, courseId: course.id }, 'Looking for academic year');
          errors.push(`Academic year "${item.yearOfStudy}" not found for course "${item.courseName}"`);
          continue;
        }

        // Find section by name, course, department, and academic year
        const section = await sectionRepository.findByNameCourseDepYear(
          item.sectionName,
          course.id,
          department.id,
          academicYear.id
        );
        if (!section) {
          errors.push(
            `Section "${item.sectionName}" not found for course "${item.courseName}", department "${item.departmentName}", year "${item.yearOfStudy}"`
          );
          continue;
        }

        if (errors.length <= 0) {
          // Create student user in database first
          const temporaryPassword = item.password || 'TempPassword@123';

          // Create invitation for student
          const invitationToken =
            'inv-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 14); // Students get 14 days to register
          const invitation = await invitationRepository.createInvitationForBulkUpload({
            email: item.email,
            role: 'student',
            sentBy: req.user.id,
            collegeId: staffCollegeId,
            departmentId: department.id,
            invitationToken,
            expiresAt,
            status: 'pending',
            name: item.name,
            phone: item.phone,
            yearOfStudy:
              Number.parseInt(academicYear.year_name.substring(7, 11)) -
              Number.parseInt(academicYear.year_name.substring(0, 4)),
            section: item.sectionName,
            rollNumber: item.rollNumber,
            designation: '',
            qualification: '',
            experience: 0,
            academic_year_id: academicYear.id,
            course_id: course.id,
            section_id: section.id,
          });

          // Send email invitation with temporary password
          try {
            const emailOptions = emailService.generateStudentInvitationEmail(
              item.name,
              item.email,
              item.rollNumber,
              item.yearOfStudy,
              item.sectionName,
              item.departmentName,
              req.user.name || 'Staff Member',
              invitationToken
            );

            await emailService.sendEmail(emailOptions);

            invitationsSent.push({
              name: item.name,
              email: item.email,
              rollNumber: item.rollNumber,
              yearOfStudy: item.yearOfStudy,
              sectionName: item.sectionName,
              departmentName: item.departmentName,
              courseName: item.courseName,
            });
          } catch (emailError) {
            console.error('Failed to send invitation email:', emailError);
            errors.push(`Failed to send invitation email to ${item.email}`);
          }

          successfulUploads.push({
            name: item.name,
            email: item.email,
            rollNumber: item.rollNumber,
            yearOfStudy: item.yearOfStudy,
            sectionName: item.sectionName,
            courseName: item.courseName,
            studentId: null,
            department: department,
            course: course,
            section: section,
            academicYear: academicYear,
            guardianName: item.guardianName,
            invitationSent: true,
          });
        }
      } catch (error) {
        console.error('Error processing student:', error);
        errors.push(`Failed to process ${item.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (cleanupError) {
      console.error('Failed to clean up uploaded file:', cleanupError);
    }

    res.status(200).json({
      success: true,
      message: 'Student bulk upload completed',
      data: {
        totalProcessed: results.length,
        successfulUploads: successfulUploads.length,
        invitationsSent: invitationsSent.length,
        errors: errors.length,
        details: {
          successful: successfulUploads,
          invitations: invitationsSent,
          errors: errors,
        },
      },
    });
  } catch (error) {
    console.error('Student bulk upload error:', error);

    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Failed to clean up uploaded file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to process student bulk upload',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get student bulk upload template
 */
export const getStudentUploadTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const csvTemplate = [
      'First Name,Last Name,Email Address,Phone Number,Password,Registration Number,Department,Course,Batch,Section',
      'John,Student,john.student@college.edu,+1-555-0123,TempPassword@123,CS21001,Computer Science,Bachelor of Computer Science,2021 - 2022,A',
      'Jane,Student,jane.student@college.edu,+1-555-0125,TempPassword@123,CS21002,Computer Science,Bachelor of Computer Science,2021 - 2022,A',
      'Mike,Student,mike.student@college.edu,+1-555-0127,TempPassword@123,EC21001,Electronics,Bachelor of Electronics,2021 - 2022,B',
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="student_upload_template.csv"');
    res.send(csvTemplate);
  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template',
    });
  }
};
