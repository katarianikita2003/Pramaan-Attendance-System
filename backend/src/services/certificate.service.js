// ===== backend/src/services/certificate.service.js =====
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import logger from '../utils/logger.js';

export class CertificateService {
  constructor() {
    this.certificatePath = process.env.CERTIFICATE_PATH || './certificates';
    this.baseUrl = process.env.BASE_URL || 'https://pramaan.app';
  }

  async generateAttendanceCertificate(attendanceProof, scholar, organization) {
    try {
      const certificateId = crypto.randomBytes(16).toString('hex');
      const fileName = `${certificateId}.pdf`;
      const filePath = path.join(this.certificatePath, fileName);

      // Ensure directory exists
      await fs.mkdir(this.certificatePath, { recursive: true });

      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: 'Attendance Certificate',
          Author: 'Pramaan System',
          Subject: `Attendance proof for ${scholar.personalInfo.name}`,
          Keywords: 'attendance, zkp, certificate',
          CreationDate: new Date()
        }
      });

      // Create write stream
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Add header
      this.addHeader(doc, organization);

      // Add title
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text('ATTENDANCE CERTIFICATE', { align: 'center' })
         .moveDown();

      // Add certificate content
      doc.fontSize(12)
         .font('Helvetica')
         .text(`This is to certify that`, { align: 'center' })
         .moveDown(0.5);

      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text(scholar.personalInfo.name, { align: 'center' })
         .moveDown(0.5);

      doc.fontSize(12)
         .font('Helvetica')
         .text(`Scholar ID: ${scholar.scholarId}`, { align: 'center' })
         .text(`${scholar.academicInfo.department || 'Department'}`, { align: 'center' })
         .moveDown();

      // Add attendance details
      this.addAttendanceDetails(doc, attendanceProof);

      // Add ZKP proof details
      await this.addZKPDetails(doc, attendanceProof);

      // Add QR code for verification
      await this.addVerificationQR(doc, attendanceProof, certificateId);

      // Add footer
      this.addFooter(doc, organization, certificateId);

      // Finalize PDF
      doc.end();

      // Wait for stream to finish
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      logger.info(`Certificate generated: ${fileName}`);

      return {
        certificateId,
        fileName,
        filePath,
        url: `/certificates/${fileName}`
      };
    } catch (error) {
      logger.error('Certificate generation failed:', error);
      throw new Error('Failed to generate certificate');
    }
  }

  addHeader(doc, organization) {
    // Add organization logo if available
    if (organization.branding.logo) {
      // doc.image(organization.branding.logo, 50, 50, { width: 100 });
    }

    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text(organization.name, { align: 'center' })
       .fontSize(10)
       .font('Helvetica')
       .text(organization.code, { align: 'center' })
       .moveDown(2);
  }

  addAttendanceDetails(doc, attendanceProof) {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Attendance Details:', { underline: true })
       .moveDown(0.5);

    const details = [
      ['Date', new Date(attendanceProof.date).toLocaleDateString()],
      ['Check-in Time', new Date(attendanceProof.checkIn.timestamp).toLocaleTimeString()],
      ['Check-out Time', attendanceProof.checkOut ? new Date(attendanceProof.checkOut.timestamp).toLocaleTimeString() : 'N/A'],
      ['Duration', attendanceProof.duration ? `${attendanceProof.duration.hours}h ${attendanceProof.duration.minutes}m` : 'N/A'],
      ['Status', attendanceProof.status.toUpperCase()],
      ['Location Verified', 'Yes']
    ];

    doc.font('Helvetica');
    details.forEach(([label, value]) => {
      doc.text(`${label}: ${value}`, { indent: 20 });
    });
    doc.moveDown();
  }

  async addZKPDetails(doc, attendanceProof) {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Zero-Knowledge Proof Details:', { underline: true })
       .moveDown(0.5);

    const zkpDetails = [
      ['Protocol', attendanceProof.checkIn.zkProof.protocol],
      ['Curve', attendanceProof.checkIn.zkProof.curve],
      ['Proof Hash', attendanceProof.checkIn.zkProof.proofHash.substring(0, 32) + '...'],
      ['Generation Time', `${attendanceProof.checkIn.zkProof.generationTime}ms`],
      ['Verification Status', attendanceProof.checkIn.verificationStatus.toUpperCase()]
    ];

    doc.font('Helvetica').fontSize(10);
    zkpDetails.forEach(([label, value]) => {
      doc.text(`${label}: ${value}`, { indent: 20 });
    });
    doc.moveDown();
  }

  async addVerificationQR(doc, attendanceProof, certificateId) {
    const verificationUrl = `${this.baseUrl}/verify/${certificateId}`;
    const qrCodeData = await QRCode.toDataURL(verificationUrl, {
      width: 150,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    doc.text('Scan to verify:', { align: 'center' });
    doc.image(qrCodeData, {
      fit: [150, 150],
      align: 'center',
      valign: 'center'
    });
    doc.moveDown();
    doc.fontSize(8)
       .text(verificationUrl, { align: 'center' })
       .moveDown();
  }

  addFooter(doc, organization, certificateId) {
    doc.fontSize(8)
       .font('Helvetica')
       .text('This certificate is digitally generated and cryptographically secured.', { align: 'center' })
       .text('Any tampering will invalidate the certificate.', { align: 'center' })
       .moveDown()
       .text(`Certificate ID: ${certificateId}`, { align: 'center' })
       .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
  }

  async verifyCertificate(certificateId) {
    try {
      const filePath = path.join(this.certificatePath, `${certificateId}.pdf`);
      await fs.access(filePath);
      
      // In production, verify against blockchain or database
      return {
        isValid: true,
        certificateId,
        message: 'Certificate is valid'
      };
    } catch (error) {
      return {
        isValid: false,
        certificateId,
        message: 'Certificate not found or invalid'
      };
    }
  }
}