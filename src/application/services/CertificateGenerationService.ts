import { Pool } from 'pg';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface CertificateData {
  userId: string;
  userName: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  sessionId: string;
  examinationAttemptId: string;
  finalScore: number;
  percentage: number;
  completedAt: Date;
}

export class CertificateGenerationService {
  private pool: Pool;
  private certificatesDir: string;

  constructor(pool: Pool) {
    this.pool = pool;
    // Store certificates in a dedicated directory
    this.certificatesDir = path.join(process.cwd(), 'certificates');
    
    // Create certificates directory if it doesn't exist
    if (!fs.existsSync(this.certificatesDir)) {
      fs.mkdirSync(this.certificatesDir, { recursive: true });
    }
  }

  /**
   * Generate certificate for a student who passed an examination
   */
  public async generateCertificate(data: CertificateData): Promise<string> {
    try {
      // Generate certificate number
      const certificateNumber = await this.generateCertificateNumber();

      // Generate PDF certificate
      const certificateFileName = `${certificateNumber}.pdf`;
      const certificateFilePath = path.join(this.certificatesDir, certificateFileName);
      
      await this.createCertificatePDF(certificateFilePath, {
        ...data,
        certificateNumber
      });

      // Calculate certificate hash for verification
      const certificateHash = await this.calculateFileHash(certificateFilePath);

      // Determine grade based on percentage
      const grade = this.calculateGrade(data.percentage);

      // Store certificate record in database
      const certificateUrl = `/certificates/${certificateFileName}`; // Relative URL for serving
      
      await this.pool.query(
        `INSERT INTO lmsact.course_certificates (
          certificate_number,
          user_id,
          subject_id,
          session_id,
          examination_attempt_id,
          final_score,
          percentage,
          grade,
          certificate_url,
          certificate_hash,
          issued_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING id`,
        [
          certificateNumber,
          data.userId,
          data.subjectId,
          data.sessionId,
          data.examinationAttemptId,
          data.finalScore,
          data.percentage,
          grade,
          certificateUrl,
          certificateHash
        ]
      );

      console.log(`✅ Certificate generated: ${certificateNumber} for user ${data.userId}`);
      return certificateUrl;
    } catch (error) {
      console.error('❌ Error generating certificate:', error);
      throw error;
    }
  }

  /**
   * Generate unique certificate number in format ACTLMS-YYYY-NNNNNN
   */
  private async generateCertificateNumber(): Promise<string> {
    const result = await this.pool.query(
      'SELECT lmsact.generate_certificate_number() as certificate_number'
    );
    return result.rows[0].certificate_number;
  }

  /**
   * Create PDF certificate with professional design
   */
  private async createCertificatePDF(
    filePath: string,
    data: CertificateData & { certificateNumber: string }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Certificate border
        doc
          .lineWidth(10)
          .strokeColor('#1e40af')
          .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
          .stroke();

        doc
          .lineWidth(2)
          .strokeColor('#3b82f6')
          .rect(30, 30, doc.page.width - 60, doc.page.height - 60)
          .stroke();

        // Header
        doc
          .fontSize(40)
          .fillColor('#1e40af')
          .font('Helvetica-Bold')
          .text('CERTIFICATE OF COMPLETION', 0, 80, {
            align: 'center',
            width: doc.page.width
          });

        // Subtitle
        doc
          .fontSize(16)
          .fillColor('#6b7280')
          .font('Helvetica')
          .text('Student-ACT Learning Management System', 0, 140, {
            align: 'center',
            width: doc.page.width
          });

        // Divider line
        doc
          .moveTo(200, 180)
          .lineTo(doc.page.width - 200, 180)
          .strokeColor('#d1d5db')
          .lineWidth(1)
          .stroke();

        // Main content
        doc
          .fontSize(14)
          .fillColor('#374151')
          .font('Helvetica')
          .text('This is to certify that', 0, 220, {
            align: 'center',
            width: doc.page.width
          });

        doc
          .fontSize(32)
          .fillColor('#1e40af')
          .font('Helvetica-Bold')
          .text(data.userName, 0, 260, {
            align: 'center',
            width: doc.page.width
          });

        doc
          .fontSize(14)
          .fillColor('#374151')
          .font('Helvetica')
          .text('has successfully completed the course', 0, 310, {
            align: 'center',
            width: doc.page.width
          });

        doc
          .fontSize(24)
          .fillColor('#1e40af')
          .font('Helvetica-Bold')
          .text(`${data.subjectCode} - ${data.subjectName}`, 0, 345, {
            align: 'center',
            width: doc.page.width
          });

        // Score information
        doc
          .fontSize(14)
          .fillColor('#374151')
          .font('Helvetica')
          .text(
            `with a final score of ${data.finalScore} (${data.percentage}%)`,
            0,
            395,
            {
              align: 'center',
              width: doc.page.width
            }
          );

        // Date and certificate number
        const formattedDate = new Date(data.completedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        doc
          .fontSize(12)
          .fillColor('#6b7280')
          .font('Helvetica')
          .text(`Date of Completion: ${formattedDate}`, 0, 450, {
            align: 'center',
            width: doc.page.width
          });

        doc
          .fontSize(10)
          .fillColor('#9ca3af')
          .text(`Certificate No: ${data.certificateNumber}`, 0, 475, {
            align: 'center',
            width: doc.page.width
          });

        // Footer signature line
        const signatureY = 520;
        const signatureWidth = 200;
        const leftSignatureX = 150;
        const rightSignatureX = doc.page.width - 150 - signatureWidth;

        // Left signature (Instructor)
        doc
          .moveTo(leftSignatureX, signatureY)
          .lineTo(leftSignatureX + signatureWidth, signatureY)
          .strokeColor('#9ca3af')
          .lineWidth(1)
          .stroke();

        doc
          .fontSize(10)
          .fillColor('#6b7280')
          .font('Helvetica')
          .text('Instructor Signature', leftSignatureX, signatureY + 10, {
            width: signatureWidth,
            align: 'center'
          });

        // Right signature (HOD)
        doc
          .moveTo(rightSignatureX, signatureY)
          .lineTo(rightSignatureX + signatureWidth, signatureY)
          .strokeColor('#9ca3af')
          .lineWidth(1)
          .stroke();

        doc
          .fontSize(10)
          .fillColor('#6b7280')
          .font('Helvetica')
          .text('Head of Department', rightSignatureX, signatureY + 10, {
            width: signatureWidth,
            align: 'center'
          });

        // Finalize PDF
        doc.end();

        stream.on('finish', () => {
          console.log(`✅ PDF certificate created: ${filePath}`);
          resolve();
        });

        stream.on('error', (error) => {
          console.error('❌ Error writing PDF:', error);
          reject(error);
        });
      } catch (error) {
        console.error('❌ Error creating PDF document:', error);
        reject(error);
      }
    });
  }

  /**
   * Calculate SHA-256 hash of certificate file for verification
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Calculate grade based on percentage
   */
  private calculateGrade(percentage: number): string {
    if (percentage >= 90) return 'A+';
    if (percentage >= 85) return 'A';
    if (percentage >= 80) return 'A-';
    if (percentage >= 75) return 'B+';
    if (percentage >= 70) return 'B';
    if (percentage >= 65) return 'B-';
    if (percentage >= 60) return 'C+';
    if (percentage >= 55) return 'C';
    if (percentage >= 50) return 'C-';
    return 'F';
  }

  /**
   * Revoke a certificate
   */
  public async revokeCertificate(
    certificateId: string,
    revokedBy: string,
    reason: string
  ): Promise<void> {
    await this.pool.query(
      `UPDATE lmsact.course_certificates
       SET is_revoked = true,
           revoked_at = NOW(),
           revoked_by = $2,
           revocation_reason = $3
       WHERE id = $1`,
      [certificateId, revokedBy, reason]
    );

    console.log(`✅ Certificate ${certificateId} revoked by ${revokedBy}`);
  }

  /**
   * Verify certificate authenticity
   */
  public async verifyCertificate(certificateNumber: string): Promise<{
    valid: boolean;
    certificate?: any;
    message: string;
  }> {
    const result = await this.pool.query(
      `SELECT 
        cc.*,
        u.name as user_name,
        u.email as user_email
       FROM lmsact.course_certificates cc
       JOIN lmsact.users u ON cc.user_id = u.id
       WHERE cc.certificate_number = $1`,
      [certificateNumber]
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        message: 'Certificate not found'
      };
    }

    const certificate = result.rows[0];

    if (certificate.is_revoked) {
      return {
        valid: false,
        certificate,
        message: `Certificate revoked on ${certificate.revoked_at}. Reason: ${certificate.revocation_reason}`
      };
    }

    // Verify file hash
    const certificateFilePath = path.join(
      this.certificatesDir,
      `${certificateNumber}.pdf`
    );

    if (fs.existsSync(certificateFilePath)) {
      const currentHash = await this.calculateFileHash(certificateFilePath);
      if (currentHash !== certificate.certificate_hash) {
        return {
          valid: false,
          certificate,
          message: 'Certificate file has been tampered with'
        };
      }
    }

    return {
      valid: true,
      certificate,
      message: 'Certificate is valid and authentic'
    };
  }
}

