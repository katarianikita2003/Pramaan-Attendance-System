// backend/src/services/certificate.service.js
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CertificateService {
  constructor() {
    this.certificateDir = path.join(__dirname, '../../certificates');
  }

  /**
   * Generate attendance certificate
   */
  async generateCertificate(attendanceProof, scholar, organization) {
    try {
      const certificateId = `CERT-${Date.now()}-${attendanceProof._id}`;
      const filename = `${certificateId}.pdf`;
      const filepath = path.join(this.certificateDir, filename);

      // Ensure directory exists
      await fs.mkdir(this.certificateDir, { recursive: true });

      // Create PDF
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      // Stream to file
      const stream = doc.pipe(fs.createWriteStream(filepath));

      // Add content
      this.addCertificateContent(doc, {
        certificateId,
        attendanceProof,
        scholar,
        organization
      });

      // Generate QR code
      const qrData = {
        certificateId,
        proofHash: attendanceProof.proofData.proofHash,
        date: attendanceProof.metadata.date,
        verifyUrl: `${process.env.BASE_URL}/verify/${certificateId}`
      };

      const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));
      
      // Add QR code to PDF
      doc.image(qrCode, 400, 600, { width: 150 });

      // Finalize PDF
      doc.end();

      await new Promise((resolve) => stream.on('finish', resolve));

      logger.info(`Certificate generated: ${certificateId}`);

      return {
        certificateId,
        filename,
        qrCode,
        url: `/certificates/${filename}`
      };

    } catch (error) {
      logger.error('Certificate generation failed:', error);
      throw error;
    }
  }

  /**
   * Add content to certificate PDF
   */
  addCertificateContent(doc, data) {
    const { certificateId, attendanceProof, scholar, organization } = data;

    // Header
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text('ATTENDANCE CERTIFICATE', { align: 'center' });

    doc.moveDown();
    
    // Organization name
    doc.fontSize(18)
       .text(organization.name, { align: 'center' });

    doc.moveDown(2);

    // Certificate ID
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Certificate ID: ${certificateId}`, { align: 'right' });

    doc.moveDown();

    // Main content
    doc.fontSize(12)
       .text('This is to certify that', { align: 'center' });

    doc.moveDown();
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text(scholar.personalInfo.name, { align: 'center' });

    doc.moveDown();
    
    doc.fontSize(12)
       .font('Helvetica')
       .text(`Scholar ID: ${scholar.scholarId}`, { align: 'center' });

    if (scholar.academicInfo.department) {
      doc.text(`Department: ${scholar.academicInfo.department}`, { align: 'center' });
    }

    doc.moveDown(2);

    // Attendance details
    const attendanceDate = new Date(attendanceProof.metadata.date);
    const checkInTime = new Date(attendanceProof.metadata.checkInTime);

    doc.text('Has marked their attendance on', { align: 'center' });
    doc.moveDown();
    
    doc.font('Helvetica-Bold')
       .text(attendanceDate.toLocaleDateString('en-US', {
         weekday: 'long',
         year: 'numeric',
         month: 'long',
         day: 'numeric'
       }), { align: 'center' });

    doc.moveDown();
    
    doc.font('Helvetica')
       .text(`Check-in Time: ${checkInTime.toLocaleTimeString('en-US', {
         hour: '2-digit',
         minute: '2-digit'
       })}`, { align: 'center' });

    doc.text(`Status: ${attendanceProof.metadata.status.toUpperCase()}`, { align: 'center' });

    if (attendanceProof.metadata.location.campus) {
      doc.text(`Campus: ${attendanceProof.metadata.location.campus}`, { align: 'center' });
    }

    doc.moveDown(3);

    // Verification
    doc.fontSize(10)
       .text('This certificate is cryptographically verified using Zero-Knowledge Proof', 
             { align: 'center' });
    
    doc.moveDown();
    
    doc.text(`Proof Hash: ${attendanceProof.proofData.proofHash.substring(0, 32)}...`, 
             { align: 'center' });

    doc.moveDown(3);

    // Footer
    doc.fontSize(8)
       .text('Scan the QR code below to verify this certificate', { align: 'center' });
  }

  /**
   * Verify certificate
   */
  async verifyCertificate(certificateId) {
    try {
      // In production, this would check against blockchain or database
      // For MVP, we'll do basic validation
      
      const filename = `${certificateId}.pdf`;
      const filepath = path.join(this.certificateDir, filename);

      try {
        await fs.access(filepath);
        return {
          valid: true,
          certificateId,
          message: 'Certificate is valid'
        };
      } catch {
        return {
          valid: false,
          certificateId,
          message: 'Certificate not found'
        };
      }

    } catch (error) {
      logger.error('Certificate verification failed:', error);
      throw error;
    }
  }
}