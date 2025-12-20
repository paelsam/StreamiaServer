import { NotificationService } from "../src/services/notificationService";
import { Resend } from "resend";
import fs from "fs";

// Create mockSend before mocking
const mockSend = jest.fn().mockResolvedValue({ id: "test-email-id", data: null, error: null });

// Mock Resend module
jest.mock("resend");
const MockedResend = Resend as jest.MockedClass<typeof Resend>;

// Mock config module
jest.mock("../src/config", () => ({
  config: {
    smtp: {
      host: "smtp.resend.com",
      port: 587,
      secure: false,
      auth: {
        user: "resend",
        pass: "re_test_api_key_123",
      },
    },
    email: {
      from: "onboarding@resend.dev",
    },
  },
}));

// Mock fs
jest.mock("fs");

describe("NotificationService - Email Sending", () => {
  let notificationService: NotificationService;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup Resend mock implementation
    MockedResend.mockImplementation(() => ({
      emails: {
        send: mockSend,
      },
    } as any));
    
    // Reset mockSend to default resolved value
    mockSend.mockResolvedValue({ id: "test-email-id", data: null, error: null });

    // Silence console.log and console.error
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    // Mock fs.existsSync to return true by default
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    // Mock fs.readFileSync to return a simple template
    (fs.readFileSync as jest.Mock).mockReturnValue(
      "<html><body>Hola {{nombre}}, {{mensaje}}</body></html>"
    );

    notificationService = new NotificationService();
  });

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("sendEmail", () => {
    it("sends an email with the correct template and data", async () => {
      const to = "user@example.com";
      const subject = "Test Subject";
      const template = "welcome";
      const data = { nombre: "John Doe", mensaje: "Welcome message" };

      await notificationService.sendEmail(to, subject, template, data);

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.readFileSync).toHaveBeenCalled();
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          subject,
          html: expect.stringContaining("John Doe"),
          from: "onboarding@resend.dev",
        })
      );
    });

    it("throws an error if template does not exist", async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(
        notificationService.sendEmail(
          "user@example.com",
          "Subject",
          "non-existent",
          {}
        )
      ).rejects.toThrow("Template not found: non-existent");
    });

    it("throws an error if email sending fails", async () => {
      mockSend.mockRejectedValue(new Error("Resend API Error"));

      await expect(
        notificationService.sendEmail(
          "user@example.com",
          "Subject",
          "welcome",
          { nombre: "Test" }
        )
      ).rejects.toThrow("Failed to send email: Resend API Error");
    });

    it("replaces all placeholders in the template", async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(
        "<html>{{nombre}} - {{email}} - {{code}}</html>"
      );

      await notificationService.sendEmail(
        "user@example.com",
        "Subject",
        "template",
        { nombre: "John", email: "john@test.com", code: "123456" }
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining("John - john@test.com - 123456"),
        })
      );
    });

    it("handles empty placeholders gracefully", async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(
        "<html>{{nombre}} - {{missing}}</html>"
      );

      await notificationService.sendEmail(
        "user@example.com",
        "Subject",
        "template",
        { nombre: "John" }
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining("John - "),
        })
      );
    });
  });

  describe("sendWelcomeEmail", () => {
    it("sends a welcome email with the correct data", async () => {
      const to = "newuser@example.com";
      const username = "NewUser";

      await notificationService.sendWelcomeEmail(to, username);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          subject: "¡Bienvenido a Streamia!",
          html: expect.stringContaining("NewUser"),
        })
      );
    });

    it("uses the welcome template", async () => {
      const to = "newuser@example.com";
      const username = "NewUser";

      await notificationService.sendWelcomeEmail(to, username);

      expect(fs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining("welcome.html"),
        "utf-8"
      );
    });
  });

  describe("sendPasswordResetEmail", () => {
    it("sends a password reset email with the correct data", async () => {
      const to = "user@example.com";
      const username = "TestUser";
      const resetUrl = "https://streamia.com/reset?token=abc123";

      (fs.readFileSync as jest.Mock).mockReturnValue(
        "<html>Hola {{nombre}}, {{resetUrl}}</html>"
      );

      await notificationService.sendPasswordResetEmail(to, username, resetUrl);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          subject: "Restablecimiento de contraseña - Streamia",
          html: expect.stringContaining(username),
        })
      );
    });

    it("includes the reset URL in the email", async () => {
      const to = "user@example.com";
      const username = "TestUser";
      const resetUrl = "https://streamia.com/reset?token=abc123";

      (fs.readFileSync as jest.Mock).mockReturnValue(
        "<html>Click: {{resetUrl}}</html>"
      );

      await notificationService.sendPasswordResetEmail(to, username, resetUrl);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(resetUrl),
        })
      );
    });

    it("uses the password-reset template", async () => {
      const to = "user@example.com";
      const username = "TestUser";
      const resetUrl = "https://streamia.com/reset?token=abc123";

      await notificationService.sendPasswordResetEmail(to, username, resetUrl);

      expect(fs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining("password-reset.html"),
        "utf-8"
      );
    });
  });

  describe("sendNotification", () => {
    it("sends a generic notification with username", async () => {
      const to = "user@example.com";
      const subject = "New Notification";
      const message = "You have a new update";
      const username = "JohnDoe";

      await notificationService.sendNotification(
        to,
        subject,
        message,
        username
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          subject,
          html: expect.stringContaining("JohnDoe"),
        })
      );
    });

    it("sends a notification with default username when not provided", async () => {
      const to = "user@example.com";
      const subject = "New Notification";
      const message = "You have a new update";

      await notificationService.sendNotification(to, subject, message);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          subject,
          html: expect.stringContaining("Usuario"),
        })
      );
    });

    it("includes the message in the notification", async () => {
      const to = "user@example.com";
      const subject = "New Notification";
      const message = "Important update about your account";

      await notificationService.sendNotification(to, subject, message);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(message),
        })
      );
    });

    it("uses the notification template", async () => {
      const to = "user@example.com";
      const subject = "New Notification";
      const message = "Test message";

      await notificationService.sendNotification(to, subject, message);

      expect(fs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining("notification.html"),
        "utf-8"
      );
    });
  });

  describe("verifyConnection", () => {
    it("returns true when API key is configured", async () => {
      const result = await notificationService.verifyConnection();

      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Resend API key configured successfully"
      );
    });

    it("returns false when API key is empty", async () => {
      // Mock the config to return empty API key
      const configModule = require("../src/config");
      const originalPass = configModule.config.smtp.auth.pass;
      configModule.config.smtp.auth.pass = "";

      const result = await notificationService.verifyConnection();

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Restore original value
      configModule.config.smtp.auth.pass = originalPass;
    });
  });
});
