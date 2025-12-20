import { EventBus, EVENTS, SendEmailEvent } from '@streamia/shared';
import { NotificationService } from '../services';

export class NotificationConsumer {
  private eventBus: EventBus;
  private notificationService: NotificationService;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.notificationService = new NotificationService();
  }

  /**
   * Initialize consumer and subscribe to events
   */
  async initialize(): Promise<void> {
    // Subscribe to email notification events
    await this.eventBus.subscribe<SendEmailEvent>(
      EVENTS.NOTIFICATION_SEND_EMAIL,
      this.handleSendEmail.bind(this)
    );

    console.log('[NotificationConsumer] Initialized and subscribed to events');
  }

  /**
   * Handle send email event
   */
  private async handleSendEmail(event: SendEmailEvent): Promise<void> {
    const { to, subject, template, data } = event.payload;

    try {
      console.log(`[NotificationConsumer] Processing email to ${to} with template ${template}`);

      // Send email based on template type
      switch (template) {
        case 'welcome':
          await this.notificationService.sendWelcomeEmail(
            to,
            (data.username as string) || 'Usuario'
          );
          break;

        case 'password_reset':
          await this.notificationService.sendPasswordResetEmail(
            to,
            (data.username as string) || 'Usuario',
            (data.resetUrl as string) || ''
          );
          break;

        case 'account_deleted':
          await this.notificationService.sendEmail(
            to,
            'Cuenta eliminada - Streamia',
            'account_deleted',
            data
          );
          break;

        default:
          // Generic notification
          await this.notificationService.sendNotification(
            to,
            subject,
            (data.message as string) || '',
            (data.username as string)
          );
      }

      // Publish success event
      await this.eventBus.publish(EVENTS.NOTIFICATION_SENT, {
        to,
        template,
        sentAt: new Date().toISOString(),
      });

      console.log(`[NotificationConsumer] Email sent successfully to ${to}`);
    } catch (error) {
      console.error(`[NotificationConsumer] Failed to send email to ${to}:`, error);

      // Publish failure event
      await this.eventBus.publish(EVENTS.NOTIFICATION_FAILED, {
        to,
        template,
        error: error instanceof Error ? error.message : 'Unknown error',
        failedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Verify email service connection
   */
  async verifyEmailService(): Promise<void> {
    const isConnected = await this.notificationService.verifyConnection();
    if (!isConnected) {
      console.warn('[NotificationConsumer] Email service connection failed');
    }
  }
}
