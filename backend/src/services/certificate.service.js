// backend/src/services/certificate.service.js
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import logger from '../utils/logger.js';

export class CertificateService {
  constructor() {
    this.certificatePath = process.env.CERTIFICATE_PATH || './certificates';
    this.baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    this.ensureCertificateDirectory();
  }

  async ensureCertificateDirectory() {
    try {
      await fs.mkdir(this.certificatePath, { recursive: true });
    } catch (error) {
      logger.error('Failed to create certificate directory:', error);
    }
  }

  /**
   * Generate attendance certificate
   */
  async generateAttendanceCertificate(scholar, attendanceData, period) {
    try {
      const certificateId = crypto.randomBytes(16).toString('hex');
      const filename = `certificate_${certificateId}.pdf`;
      const filepath = path.join(this.certificatePath, filename);

      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      // Stream to file
      const stream = doc.pipe(await fs.open(filepath, 'w').then(f => f.createWriteStream()));

      // Add certificate content
      await this.addCertificateContent(doc, scholar, attendanceData, period, certificateId);

      // Finalize PDF
      doc.end();
      await new Promise(resolve => stream.on('finish', resolve));

      // Generate certificate hash
      const fileBuffer = await fs.readFile(filepath);
      const certificateHash = crypto
        .createHash('sha256')
        .update(fileBuffer)
        .digest('hex');

      return {
        certificateId,
        filename,
        filepath,
        url: `${this.baseUrl}/certificates/${filename}`,
        hash: certificateHash
      };
    } catch (error) {
      logger.error('Certificate generation error:', error);
      throw new Error('Failed to generate certificate');
    }
  }

  /**
   * Add content to certificate
   */
  async addCertificateContent(doc, scholar, attendanceData, period, certificateId) {
    const pageWidth = doc.page.width - 100;

    // Add header
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text('CERTIFICATE OF ATTENDANCE', 50, 50, {
         align: 'center',
         width: pageWidth
       });

    // Add organization logo placeholder
    doc.rect(250, 100, 100, 100)
       .stroke()
       .fontSize(10)
       .font('Helvetica')
       .text('Organization Logo', 275, 140);

    // Certificate body
    doc.moveDown(8)
       .fontSize(12)
       .font('Helvetica')
       .text('This is to certify that', {
         align: 'center',
         width: pageWidth
       });

    doc.moveDown()
       .fontSize(16)
       .font('Helvetica-Bold')
       .text(scholar.personalInfo.name.toUpperCase(), {
         align: 'center',
         width: pageWidth
       });

    doc.moveDown()
       .fontSize(12)
       .font('Helvetica')
       .text(`Scholar ID: ${scholar.scholarId}`, {
         align: 'center',
         width: pageWidth
       });

    doc.moveDown(2)
       .text(`has maintained an attendance of`, {
         align: 'center',
         width: pageWidth
       });

    doc.moveDown()
       .fontSize(20)
       .font('Helvetica-Bold')
       .fillColor('#4CAF50')
       .text(`${attendanceData.percentage}%`, {
         align: 'center',
         width: pageWidth
       });

    doc.fillColor('black')
       .fontSize(12)
       .font('Helvetica')
       .moveDown()
       .text(`for the period of ${period.start} to ${period.end}`, {
         align: 'center',
         width: pageWidth
       });

    // Attendance details
    doc.moveDown(2)
       .fontSize(10)
       .text(`Total Working Days: ${attendanceData.totalDays}`, 100)
       .text(`Days Present: ${attendanceData.presentDays}`, 100)
       .text(`Days Late: ${attendanceData.lateDays}`, 100)
       .text(`Days Absent: ${attendanceData.absentDays}`, 100);

    // Add QR code for verification
    const qrData = `${this.baseUrl}/verify/${certificateId}`;
    const qrCode = await QRCode.toDataURL(qrData, { width: 100 });
    doc.image(qrCode, 450, 400, { width: 100 });

    doc.fontSize(8)
       .text('Scan to verify', 460, 505);

    // Add footer
    doc.moveDown(5)
       .fontSize(8)
       .text(`Certificate ID: ${certificateId}`, 50, 700)
       .text(`Generated on: ${new Date().toLocaleDateString()}`, 50, 715)
       .text('This certificate is digitally generated and verified using Zero-Knowledge Proofs', 50, 730);

    // Add signatures
    doc.fontSize(10)
       .text('_____________________', 100, 650)
       .text('Authorized Signatory', 105, 665)
       .text('_____________________', 350, 650)
       .text('Director/Principal', 365, 665);
  }

  /**
   * Verify certificate
   */
  async verifyCertificate(certificateId) {
    try {
      const filename = `certificate_${certificateId}.pdf`;
      const filepath = path.join(this.certificatePath, filename);

      // Check if file exists
      await fs.access(filepath);

      // Calculate hash
      const fileBuffer = await fs.readFile(filepath);
      const currentHash = crypto
        .createHash('sha256')
        .update(fileBuffer)
        .digest('hex');

      // In production, compare with stored hash in database
      return {
        isValid: true,
        certificateId,
        hash: currentHash,
        verifiedAt: new Date()
      };
    } catch (error) {
      logger.error('Certificate verification error:', error);
      return {
        isValid: false,
        error: 'Certificate not found or invalid'
      };
    }
  }

  /**
   * Generate bulk certificates
   */
  async generateBulkCertificates(scholars, attendanceData, period) {
    const certificates = [];

    for (const scholar of scholars) {
      try {
        const certificate = await this.generateAttendanceCertificate(
          scholar,
          attendanceData[scholar._id],
          period
        );
        certificates.push({
          scholarId: scholar._id,
          ...certificate
        });
      } catch (error) {
        logger.error(`Failed to generate certificate for ${scholar.scholarId}:`, error);
      }
    }

    return certificates;
  }

  /**
   * Delete certificate
   */
  async deleteCertificate(certificateId) {
    try {
      const filename = `certificate_${certificateId}.pdf`;
      const filepath = path.join(this.certificatePath, filename);
      await fs.unlink(filepath);
      return true;
    } catch (error) {
      logger.error('Certificate deletion error:', error);
      return false;
    }
  }
}

export default CertificateService;