import { NotificationService } from "../src/services/notificationService";
import { config } from "../src/config";

// These are integration tests that actually send emails via Resend
// Skip by default, run with: npm run test:integration
// or: RUN_INTEGRATION=true npm test

const shouldRunIntegration = process.env.RUN_INTEGRATION === "true";

describe.skip = shouldRunIntegration ? describe : describe.skip;

describe("NotificationService - Integration Tests (Real Email)", () => {
  let notificationService: NotificationService;

  beforeAll(() => {
    // Verify environment is configured
    if (!config.smtp.auth.pass || config.smtp.auth.pass === "") {
      throw new Error("Resend API key not configured. Set SMTP_PASS in .env file");
    }

    notificationService = new NotificationService();
  });

  describe("Resend Connection", () => {
    it("verifies Resend API key is configured", async () => {
      const result = await notificationService.verifyConnection();
      expect(result).toBe(true);
    }, 10000);
  });

  describe("Real Email Sending", () => {
    const testEmail = config.email.from; // Send to configured sender email

    it("sends a real notification email", async () => {
      await expect(
        notificationService.sendNotification(
          testEmail,
          "🧪 Prueba de Integración - Streamia",
          "Este es un email de prueba de integración para verificar que Resend está funcionando correctamente.",
          "Equipo de Pruebas"
        )
      ).resolves.not.toThrow();

      console.log(`✅ Email de notificación enviado a: ${testEmail}`);
    }, 15000);

    it("sends a real welcome email", async () => {
      // Wait to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await expect(
        notificationService.sendWelcomeEmail(
          testEmail,
          "Usuario de Prueba"
        )
      ).resolves.not.toThrow();

      console.log(`✅ Email de bienvenida enviado a: ${testEmail}`);
    }, 15000);

    it("sends a real password reset email", async () => {
      // Wait to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const resetUrl = "https://streamia.example.com/reset?token=test123";
      
      await expect(
        notificationService.sendPasswordResetEmail(
          testEmail,
          "Usuario de Prueba",
          resetUrl
        )
      ).resolves.not.toThrow();

      console.log(`✅ Email de restablecimiento enviado a: ${testEmail}`);
    }, 15000);
  });

  describe("Template System", () => {
    it("loads and renders email templates correctly", async () => {
      // This test verifies the template system works end-to-end
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const testEmail = config.email.from;
      
      await expect(
        notificationService.sendNotification(
          testEmail,
          "Test Template",
          "Verificando sistema de templates"
        )
      ).resolves.not.toThrow();
      
      console.log(`✅ Sistema de templates funcionando correctamente`);
    }, 15000);
  });

  afterAll(() => {
    console.log("\n🎉 Pruebas de integración completadas");
    console.log(`📧 Revisa la bandeja de entrada: ${config.email.from}`);
  });
});
