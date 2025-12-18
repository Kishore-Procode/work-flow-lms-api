
import { Request, Response } from 'express';
import fs from 'fs';
import { learningResourceRepository } from '../../learning-resource/repositories/learning-resource.repository';
import { userRepository } from '../../user/repositories/user.repository';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { photoRestrictionService } from '../../upload/services/photo-restriction.service';
import { pool } from '../../../config/database';

export const generateCertificate = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (req.user.role !== 'student') {
        res.status(403).json({
          success: false,
          message: 'Only students can access their certificate',
        });
        return;
      }

    const studentId = req.user.id || req.user.userId;

    const resource = await learningResourceRepository.getresourceByStudentId(studentId);

    if (!resource) {
      res.status(404).json({
        success: false,
        message: 'No resource assigned to this student',
      });
      return;
    }

    const resourceDetails = await learningResourceRepository.findByIdWithDetails(resource.id);

    if (!resourceDetails) {
        res.status(404).json({
          success: false,
          message: 'Could not fetch resource details',
        });
        return;
      }

    // Check if student has completed photo uploads for all 8 semesters
    const canDownload = await photoRestrictionService.canDownloadCertificate(studentId, resource.id);

    if (!canDownload) {
        res.status(400).json({
            success: false,
            message: 'Certificate can only be downloaded after completing photo uploads for all 8 semesters of the course.',
          });
          return;
    }

    // Create a new PDFDocument
    const pdfDoc = await PDFDocument.create();
    
    const imagePath = 'src/templates/GreenO - Final Certificate.jpg';
    const imageBytes = await fs.promises.readFile(imagePath);
    const image = await pdfDoc.embedJpg(imageBytes);

    const page = pdfDoc.addPage([image.width, image.height]);

    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });

    // Set up fonts and colors
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const textColor = rgb(0, 0, 0);

    const name = resourceDetails.studentName || 'N/A';
    const department = `Student of ${resourceDetails.departmentName || 'N/A'}`;
    const college = `from ${resourceDetails.collegeName || 'N/A'}`;
    const batch = `Successfully Grown a resource in academic period of ${resourceDetails.batch_year || 'N/A'}.`;

    const { width, height } = page.getSize();

    // --- Text Wrapping and Drawing Logic ---

    const drawWrappedText = (
        text: string,
        font: any,
        fontSize: number,
        maxWidth: number,
        startY: number,
        lineHeight: number,
        isBold = false
    ) => {
        const selectedFont = isBold ? boldFont : font;
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
            const lineWithWord = currentLine === '' ? word : `${currentLine} ${word}`;
            const lineWidth = selectedFont.widthOfTextAtSize(lineWithWord, fontSize);

            if (lineWidth < maxWidth) {
                currentLine = lineWithWord;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);

        let y = startY;
        for (const line of lines) {
            const lineWidth = selectedFont.widthOfTextAtSize(line, fontSize);
            page.drawText(line, {
                x: (width - lineWidth) / 2,
                y: y,
                font: selectedFont,
                size: fontSize,
                color: textColor,
            });
            y -= lineHeight;
        }
        return y; // Return the y position for the next text block
    };

    const nameSize = 60;
    const departmentSize = 52;
    const collegeSize = 52;
    const batchSize = 52;
    
    const nameLineHeight = nameSize * 1.2;
    const departmentLineHeight = departmentSize * 1.4;
    const collegeLineHeight = collegeSize * 1.4;
    const batchLineHeight = batchSize * 1.4;

    const maxTextWidth = width * 0.8; // Use 80% of page width for text

    let currentY = height / 2 + 80;

    currentY = drawWrappedText(name, boldFont, nameSize, maxTextWidth, currentY, nameLineHeight, true);
    currentY -= 25; // Add some space between name and department
    currentY = drawWrappedText(department, font, departmentSize, maxTextWidth, currentY, departmentLineHeight);
    currentY -= 15; // Add some space
    currentY = drawWrappedText(college, font, collegeSize, maxTextWidth, currentY, collegeLineHeight);
    currentY -= 15; // Add some space
    currentY = drawWrappedText(batch, font, batchSize, maxTextWidth, currentY, batchLineHeight);

    // Serialize the PDF to bytes
    const pdfBytes = await pdfDoc.save();

    // Send the PDF as a response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=certificate.pdf');
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Generate certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate certificate',
    });
  }
};

/**
 * Generate certificate for completed play session
 */
export const generatePlaySessionCertificate = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (req.user.role !== 'student') {
      res.status(403).json({
        success: false,
        message: 'Only students can access their certificate',
      });
      return;
    }

    const { sessionId } = req.params;
    const studentId = req.user.id || req.user.userId;

    if (!sessionId) {
      res.status(400).json({
        success: false,
        message: 'Session ID is required',
      });
      return;
    }

    // Get session details with subject information via mapping table
    const sessionQuery = `
      SELECT
        s.id as session_id,
        s.title as session_title,
        s.session_description,
        csub.act_subject_name as subject_name,
        csub.act_subject_code as subject_code,
        u.name as student_name,
        u.email as student_email,
        d.name as department_name,
        col.name as college_name
      FROM workflowmgmt.sessions s
      INNER JOIN lmsact.subject_session_mapping ssm ON s.id = ssm.workflow_session_id
      INNER JOIN lmsact.content_map_sub_details csub ON ssm.content_map_sub_details_id = csub.id
      CROSS JOIN lmsact.users u
      LEFT JOIN lmsact.departments d ON u.department_id = d.id
      LEFT JOIN lmsact.colleges col ON u.college_id = col.id
      WHERE s.id = $1 AND u.id = $2 AND ssm.is_active = true AND s.is_active = true
    `;

    const sessionResult = await pool.query(sessionQuery, [sessionId, studentId]);

    if (sessionResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Session not found or you do not have access',
      });
      return;
    }

    const sessionData = sessionResult.rows[0];

    // Check if session is completed
    const progressQuery = `
      SELECT
        COUNT(*) FILTER (WHERE scp.is_completed = true) as completed_blocks,
        COUNT(*) as total_blocks,
        MAX(scp.completed_at) as last_completed_at
      FROM workflowmgmt.session_content_blocks scb
      LEFT JOIN workflowmgmt.session_content_progress scp
        ON scb.id = scp.content_block_id AND scp.user_id = $2
      WHERE scb.session_id = $1 AND scb.is_required = true
    `;

    const progressResult = await pool.query(progressQuery, [sessionId, studentId]);
    const progress = progressResult.rows[0];

    if (progress.completed_blocks < progress.total_blocks) {
      res.status(400).json({
        success: false,
        message: 'Certificate can only be generated after completing all required content blocks',
        progress: {
          completed: parseInt(progress.completed_blocks),
          total: parseInt(progress.total_blocks),
          percentage: Math.round((parseInt(progress.completed_blocks) / parseInt(progress.total_blocks)) * 100)
        }
      });
      return;
    }

    // Create PDF certificate
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]); // A4 landscape

    const { width, height } = page.getSize();

    // Set up fonts
    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Draw border
    page.drawRectangle({
      x: 30,
      y: 30,
      width: width - 60,
      height: height - 60,
      borderColor: rgb(0.2, 0.4, 0.8),
      borderWidth: 3,
    });

    page.drawRectangle({
      x: 40,
      y: 40,
      width: width - 80,
      height: height - 80,
      borderColor: rgb(0.2, 0.4, 0.8),
      borderWidth: 1,
    });

    // Title
    const title = 'CERTIFICATE OF COMPLETION';
    const titleSize = 32;
    const titleWidth = titleFont.widthOfTextAtSize(title, titleSize);
    page.drawText(title, {
      x: (width - titleWidth) / 2,
      y: height - 100,
      size: titleSize,
      font: titleFont,
      color: rgb(0.2, 0.4, 0.8),
    });

    // Subtitle
    const subtitle = 'This is to certify that';
    const subtitleSize = 16;
    const subtitleWidth = regularFont.widthOfTextAtSize(subtitle, subtitleSize);
    page.drawText(subtitle, {
      x: (width - subtitleWidth) / 2,
      y: height - 150,
      size: subtitleSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    // Student name
    const studentName = sessionData.student_name || 'Student';
    const nameSize = 28;
    const nameWidth = boldFont.widthOfTextAtSize(studentName, nameSize);
    page.drawText(studentName, {
      x: (width - nameWidth) / 2,
      y: height - 200,
      size: nameSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // Draw underline for name
    page.drawLine({
      start: { x: (width - nameWidth) / 2 - 20, y: height - 205 },
      end: { x: (width + nameWidth) / 2 + 20, y: height - 205 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Completion text
    const completionText = 'has successfully completed the learning session';
    const completionSize = 14;
    const completionWidth = regularFont.widthOfTextAtSize(completionText, completionSize);
    page.drawText(completionText, {
      x: (width - completionWidth) / 2,
      y: height - 240,
      size: completionSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    // Session title
    const sessionTitle = sessionData.session_title || 'Learning Session';
    const sessionTitleSize = 20;
    const sessionTitleWidth = boldFont.widthOfTextAtSize(sessionTitle, sessionTitleSize);
    page.drawText(sessionTitle, {
      x: (width - sessionTitleWidth) / 2,
      y: height - 280,
      size: sessionTitleSize,
      font: boldFont,
      color: rgb(0.2, 0.4, 0.8),
    });

    // Subject information
    const subjectInfo = `${sessionData.subject_code} - ${sessionData.subject_name}`;
    const subjectSize = 14;
    const subjectWidth = regularFont.widthOfTextAtSize(subjectInfo, subjectSize);
    page.drawText(subjectInfo, {
      x: (width - subjectWidth) / 2,
      y: height - 310,
      size: subjectSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    // Institution information
    if (sessionData.department_name) {
      const deptInfo = `${sessionData.department_name}`;
      const deptSize = 12;
      const deptWidth = regularFont.widthOfTextAtSize(deptInfo, deptSize);
      page.drawText(deptInfo, {
        x: (width - deptWidth) / 2,
        y: height - 340,
        size: deptSize,
        font: regularFont,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    if (sessionData.college_name) {
      const collegeInfo = sessionData.college_name;
      const collegeSize = 12;
      const collegeWidth = regularFont.widthOfTextAtSize(collegeInfo, collegeSize);
      page.drawText(collegeInfo, {
        x: (width - collegeWidth) / 2,
        y: height - 365,
        size: collegeSize,
        font: regularFont,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    // Completion date
    const completionDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const dateText = `Date of Completion: ${completionDate}`;
    const dateSize = 12;
    const dateWidth = regularFont.widthOfTextAtSize(dateText, dateSize);
    page.drawText(dateText, {
      x: (width - dateWidth) / 2,
      y: height - 420,
      size: dateSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    // Footer
    const footerText = 'Student-ACT Learning Management System';
    const footerSize = 10;
    const footerWidth = regularFont.widthOfTextAtSize(footerText, footerSize);
    page.drawText(footerText, {
      x: (width - footerWidth) / 2,
      y: 60,
      size: footerSize,
      font: regularFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Serialize the PDF to bytes
    const pdfBytes = await pdfDoc.save();

    // Send the PDF as a response
    const filename = `certificate-${sessionData.subject_code}-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Generate play session certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate certificate',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
