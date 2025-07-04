import PDFDocument from 'pdfkit';
import fs from 'fs/promises';
import path from 'path';
import QRCode from 'qrcode';
import logger from '../utils/logger.js';

export class CertificateService {
  constructor() {
    this.certificatesDir = process.env.CERTIFICATES_DIR || './certificates';
  }

  async generateAttendanceCertificate(attendanceData) {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const filename = `attendance_${attendanceData.scholarId}_${Date.now()}.pdf`;
      const filepath = path.join(this.certificatesDir, filename);

      // Create write stream
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Add header
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text('ATTENDANCE CERTIFICATE', { align: 'center' });
      
      doc.moveDown();
      
      // Add logo placeholder
      doc.rect(250, 100, 100, 100).stroke();
      
      doc.moveDown(6);
      
      // Certificate content
      doc.fontSize(12)
         .font('Helvetica')
         .text(`This is to certify that`, { align: 'center' });
      
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text(attendanceData.scholarName, { align: 'center' });
      
      doc.fontSize(12)
         .font('Helvetica')
         .text(`Scholar ID: ${attendanceData.scholarId}`, { align: 'center' });
      
      doc.moveDown();
      
      doc.text(`Has marked attendance on ${attendanceData.date}`, { align: 'center' });
      doc.text(`Check-in: ${attendanceData.checkIn}`, { align: 'center' });
      doc.text(`Check-out: ${attendanceData.checkOut || 'Not marked'}`, { align: 'center' });
      
      // Add QR code
      const qrData = {
        certificateId: filename,
        scholarId: attendanceData.scholarId,
        date: attendanceData.date,
        proofHash: attendanceData.proofHash
      };
      
      const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));
      doc.image(qrCode, 250, 400, { width: 100, height: 100 });
      
      // Add footer
      doc.fontSize(10)
         .text('Verified by Zero-Knowledge Proof', 50, 700, { align: 'center' });
      doc.text(`Certificate ID: ${filename}`, { align: 'center' });
      
      // Finalize PDF
      doc.end();
      
      await new Promise((resolve) => stream.on('finish', resolve));
      
      logger.info(`Certificate generated: ${filename}`);
      return { filename, filepath };
    } catch (error) {
      logger.error('Certificate generation failed:', error);
      throw error;
    }
  }

  async verifyCertificate(certificateId) {
    try {
      const filepath = path.join(this.certificatesDir, certificateId);
      await fs.access(filepath);
      return { valid: true, exists: true };
    } catch (error) {
      return { valid: false, exists: false };
    }
  }
}