import nodemailer, { Transporter } from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

interface EmailData {
  [key: string]: any;
}

export class NotificationService {
  private transporter: Transporter;
  private templatesPath: string;

  constructor() {
    this.templatesPath = path.join(__dirname, '../templates');
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.auth.user,
        pass: config.smtp.auth.pass,
      },
    });
  }

  /**
   * Send email using a template
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param template - Template name (without .html extension)
   * @param data - Data to replace in the template
   */
  async sendEmail(
    to: string,
    subject: string,
    template: string,
    data: EmailData
  ): Promise<void> {
    try {
      // Load template
      const templatePath = path.join(this.templatesPath, `${template}.html`);
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found: ${template}`);
      }

      let htmlContent = fs.readFileSync(templatePath, 'utf-8');

      // Replace placeholders with data
      Object.keys(data).forEach((key) => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        htmlContent = htmlContent.replace(placeholder, data[key] || '');
      });

      // Send email
      await this.transporter.sendMail({
        from: config.email.from,
        to,
        subject,
        html: htmlContent,
      });

      console.log(`Email sent successfully to ${to}`);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send welcome email to new user
   * @param to - Recipient email address
   * @param username - Username of the new user
   */
  async sendWelcomeEmail(to: string, username: string): Promise<void> {
    await this.sendEmail(
      to,
      '¡Bienvenido a Streamia!',
      'welcome',
      {
        nombre: username,
      }
    );
  }

  /**
   * Send password reset email
   * @param to - Recipient email address
   * @param username - Username
   * @param resetUrl - Password reset URL
   */
  async sendPasswordResetEmail(
    to: string,
    username: string,
    resetUrl: string
  ): Promise<void> {
    await this.sendEmail(
      to,
      'Restablecimiento de contraseña - Streamia',
      'password-reset',
      {
        nombre: username,
        resetUrl,
      }
    );
  }

  /**
   * Send generic notification email
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param message - Message content
   * @param username - Optional username
   */
  async sendNotification(
    to: string,
    subject: string,
    message: string,
    username?: string
  ): Promise<void> {
    await this.sendEmail(
      to,
      subject,
      'notification',
      {
        nombre: username || 'Usuario',
        mensaje: message,
      }
    );
  }

  /**
   * Verify transporter connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('SMTP connection verification failed:', error);
      return false;
    }
  }
}
