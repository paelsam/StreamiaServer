import { NotificationService } from "../src/services/notificationService";
import nodemailer from "nodemailer";
import fs from "fs";

// Mock nodemailer and fs
jest.mock("nodemailer");
jest.mock("fs");

describe("NotificationService", () => {
  let notificationService: NotificationService;
  let mockSendMail: jest.Mock;
  let mockVerify: jest.Mock;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Silence console.log and console.error
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    // Setup mock functions
    mockSendMail = jest.fn().mockResolvedValue({ messageId: "test-id" });
    mockVerify = jest.fn().mockResolvedValue(true);

    // Mock transporter
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
      verify: mockVerify,
    });

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
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          subject,
          html: expect.stringContaining("John Doe"),
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
      mockSendMail.mockRejectedValue(new Error("SMTP Error"));

      await expect(
        notificationService.sendEmail(
          "user@example.com",
          "Subject",
          "welcome",
          { nombre: "Test" }
        )
      ).rejects.toThrow("Failed to send email: SMTP Error");
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

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining("John - john@test.com - 123456"),
        })
      );
    });
  });

  describe("sendWelcomeEmail", () => {
    it("sends a welcome email with the correct data", async () => {
      const to = "newuser@example.com";
      const username = "NewUser";

      await notificationService.sendWelcomeEmail(to, username);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          subject: "¡Bienvenido a Streamia!",
          html: expect.stringContaining("NewUser"),
        })
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

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          subject: "Restablecimiento de contraseña - Streamia",
          html: expect.stringContaining(username),
        })
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

      expect(mockSendMail).toHaveBeenCalledWith(
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

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          subject,
          html: expect.stringContaining("Usuario"),
        })
      );
    });
  });

  describe("verifyConnection", () => {
    it("returns true when connection is verified successfully", async () => {
      const result = await notificationService.verifyConnection();

      expect(mockVerify).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("returns false when connection verification fails", async () => {
      mockVerify.mockRejectedValue(new Error("Connection failed"));

      const result = await notificationService.verifyConnection();

      expect(mockVerify).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });
});
