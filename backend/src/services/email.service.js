// ===== backend/src/services/email.service.js =====
import sgMail from '@sendgrid/mail';
import logger from '../utils/logger.js';

export class EmailService {
  constructor() {
    this.isConfigured = !!process.env.SENDGRID_API_KEY;
    if (this.isConfigured) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.fromEmail = process.env.FROM_EMAIL || 'noreply@pramaan.app';
    }
  }

  async sendEmail(to, subject, html, attachments = []) {
    if (!this.isConfigured) {
      logger.warn('Email service not configured, skipping email send');
      return { success: false, reason: 'Email service not configured' };
    }

    try {
      const msg = {
        to,
        from: this.fromEmail,
        subject,
        html,
        attachments
      };

      await sgMail.send(msg);
      logger.info(`Email sent successfully to ${to}`);
      return { success: true };
    } catch (error) {
      logger.error('Email send failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendWelcomeEmail(scholar, organization) {
    const subject = `Welcome to ${organization.name} - Pramaan Attendance System`;
    const html = `
      <h2>Welcome ${scholar.personalInfo.name}!</h2>
      <p>You have been successfully registered in the Pramaan Attendance System.</p>
      <h3>Your Details:</h3>
      <ul>
        <li>Scholar ID: ${scholar.scholarId}</li>
        <li>Organization: ${organization.name}</li>
        <li>Organization Code: ${organization.code}</li>
      </ul>
      <h3>Next Steps:</h3>
      <ol>
        <li>Download the Pramaan mobile app</li>
        <li>Login using your Scholar ID and Organization Code</li>
        <li>Complete biometric enrollment</li>
        <li>Start marking attendance</li>
      </ol>
      <p>If you have any questions, please contact your administrator.</p>
    `;

    return await this.sendEmail(scholar.personalInfo.email, subject, html);
  }

  async sendAttendanceReport(email, reportData, attachmentPath) {
    const subject = `Daily Attendance Report - ${new Date().toLocaleDateString()}`;
    const html = `
      <h2>Daily Attendance Report</h2>
      <p>Please find attached the attendance report for ${new Date().toLocaleDateString()}</p>
      <h3>Summary:</h3>
      <ul>
        <li>Total Scholars: ${reportData.total}</li>
        <li>Present: ${reportData.present}</li>
        <li>Absent: ${reportData.absent}</li>
        <li>Late: ${reportData.late}</li>
      </ul>
    `;

    const attachments = [{
      content: await fs.readFile(attachmentPath, 'base64'),
      filename: `attendance_report_${new Date().toISOString().split('T')[0]}.pdf`,
      type: 'application/pdf',
      disposition: 'attachment'
    }];

    return await this.sendEmail(email, subject, html, attachments);
  }

  async sendPasswordReset(email, resetToken, organizationName) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset Request - Pramaan';
    const html = `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset for your ${organizationName} admin account.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #6200ee; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>Or copy this link: ${resetUrl}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    return await this.sendEmail(email, subject, html);
  }
}