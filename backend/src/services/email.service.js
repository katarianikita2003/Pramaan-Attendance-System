// backend/src/services/email.service.js
import sgMail from '@sendgrid/mail';
import logger from '../utils/logger.js';

export class EmailService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@pramaan.app';
    this.isEnabled = !!process.env.SENDGRID_API_KEY;
  }

  /**
   * Send welcome email to new scholar
   */
  async sendWelcomeEmail(scholar, organization) {
    if (!this.isEnabled) {
      logger.info('Email service disabled, skipping welcome email');
      return;
    }

    const msg = {
      to: scholar.personalInfo.email,
      from: this.fromEmail,
      subject: `Welcome to ${organization.name} - Pramaan Attendance System`,
      html: this.getWelcomeEmailTemplate(scholar, organization)
    };

    try {
      await sgMail.send(msg);
      logger.info(`Welcome email sent to ${scholar.personalInfo.email}`);
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
    }
  }

  /**
   * Send attendance confirmation email
   */
  async sendAttendanceConfirmation(scholar, attendanceProof) {
    if (!this.isEnabled) return;

    const msg = {
      to: scholar.personalInfo.email,
      from: this.fromEmail,
      subject: 'Attendance Marked Successfully',
      html: this.getAttendanceEmailTemplate(scholar, attendanceProof)
    };

    try {
      await sgMail.send(msg);
    } catch (error) {
      logger.error('Failed to send attendance confirmation:', error);
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email, resetToken, userType = 'scholar') {
    if (!this.isEnabled) {
      logger.info('Email service disabled, reset token:', resetToken);
      return;
    }

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&type=${userType}`;

    const msg = {
      to: email,
      from: this.fromEmail,
      subject: 'Password Reset Request - Pramaan',
      html: this.getPasswordResetTemplate(resetUrl)
    };

    try {
      await sgMail.send(msg);
      logger.info(`Password reset email sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw error;
    }
  }

  /**
   * Send organization approval email
   */
  async sendOrganizationApprovalEmail(organization, admin) {
    if (!this.isEnabled) return;

    const msg = {
      to: admin.personalInfo.email,
      from: this.fromEmail,
      subject: 'Organization Approved - Pramaan',
      html: this.getOrganizationApprovalTemplate(organization, admin)
    };

    try {
      await sgMail.send(msg);
    } catch (error) {
      logger.error('Failed to send organization approval email:', error);
    }
  }

  /**
   * Send monthly attendance report
   */
  async sendMonthlyReport(scholar, reportData) {
    if (!this.isEnabled) return;

    const msg = {
      to: scholar.personalInfo.email,
      from: this.fromEmail,
      subject: `Monthly Attendance Report - ${reportData.month} ${reportData.year}`,
      html: this.getMonthlyReportTemplate(scholar, reportData)
    };

    try {
      await sgMail.send(msg);
    } catch (error) {
      logger.error('Failed to send monthly report:', error);
    }
  }

  // Email Templates

  getWelcomeEmailTemplate(scholar, organization) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #6C63FF; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f4f4f4; }
          .button { display: inline-block; padding: 10px 20px; background-color: #6C63FF; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Pramaan</h1>
          </div>
          <div class="content">
            <h2>Hello ${scholar.personalInfo.name},</h2>
            <p>Welcome to ${organization.name}'s attendance system powered by Pramaan!</p>
            <p>Your Scholar ID is: <strong>${scholar.scholarId}</strong></p>
            <p>You can now:</p>
            <ul>
              <li>Mark your attendance using biometric authentication</li>
              <li>View your attendance history</li>
              <li>Download attendance certificates</li>
            </ul>
            <p>Download the Pramaan mobile app to get started:</p>
            <a href="${process.env.MOBILE_APP_URL}" class="button">Download App</a>
            <p>If you have any questions, please contact your administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getAttendanceEmailTemplate(scholar, attendanceProof) {
    const date = new Date(attendanceProof.date).toLocaleDateString();
    const checkIn = new Date(attendanceProof.checkIn.time).toLocaleTimeString();
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f4f4f4; }
          .details { background-color: white; padding: 15px; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Attendance Confirmed</h1>
          </div>
          <div class="content">
            <h2>Hello ${scholar.personalInfo.name},</h2>
            <p>Your attendance has been successfully marked.</p>
            <div class="details">
              <p><strong>Date:</strong> ${date}</p>
              <p><strong>Check-in Time:</strong> ${checkIn}</p>
              <p><strong>Status:</strong> ${attendanceProof.metadata.status}</p>
              <p><strong>Verification:</strong> ✓ ZKP Verified</p>
            </div>
            <p>Keep up the good attendance!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPasswordResetTemplate(resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #FF6B6B; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f4f4f4; }
          .button { display: inline-block; padding: 10px 20px; background-color: #FF6B6B; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>You requested a password reset for your Pramaan account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>This link will expire in 30 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getOrganizationApprovalTemplate(organization, admin) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #6C63FF; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f4f4f4; }
          .button { display: inline-block; padding: 10px 20px; background-color: #6C63FF; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Organization Approved!</h1>
          </div>
          <div class="content">
            <h2>Congratulations ${admin.personalInfo.name},</h2>
            <p>${organization.name} has been approved on Pramaan!</p>
            <p>Organization Code: <strong>${organization.code}</strong></p>
            <p>You can now:</p>
            <ul>
              <li>Add scholars to your organization</li>
              <li>Manage attendance settings</li>
              <li>View reports and analytics</li>
            </ul>
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/admin/dashboard" class="button">Go to Dashboard</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getMonthlyReportTemplate(scholar, reportData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #6C63FF; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f4f4f4; }
          .stats { background-color: white; padding: 15px; border-radius: 5px; margin: 10px 0; }
          .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .stat-item { text-align: center; padding: 10px; background-color: #f8f9fa; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Monthly Attendance Report</h1>
            <h2>${reportData.month} ${reportData.year}</h2>
          </div>
          <div class="content">
            <h3>Hello ${scholar.personalInfo.name},</h3>
            <p>Here's your attendance summary for ${reportData.month}:</p>
            <div class="stats">
              <div class="stats-grid">
                <div class="stat-item">
                  <h4>Present Days</h4>
                  <p style="font-size: 24px; color: #4CAF50;">${reportData.presentDays}</p>
                </div>
                <div class="stat-item">
                  <h4>Total Days</h4>
                  <p style="font-size: 24px;">${reportData.totalDays}</p>
                </div>
                <div class="stat-item">
                  <h4>Attendance %</h4>
                  <p style="font-size: 24px; color: ${reportData.percentage >= 75 ? '#4CAF50' : '#FF6B6B'};">
                    ${reportData.percentage}%
                  </p>
                </div>
                <div class="stat-item">
                  <h4>Late Days</h4>
                  <p style="font-size: 24px;">${reportData.lateDays}</p>
                </div>
              </div>
            </div>
            <p>Keep maintaining good attendance!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export default EmailService;