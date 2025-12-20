import { NotificationService } from "../src/services/notificationService";
import { Resend } from "resend";

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

describe("NotificationService - Integration Tests", () => {
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

    notificationService = new NotificationService();
  });

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("Service Initialization", () => {
    it("creates a NotificationService instance successfully", () => {
      expect(notificationService).toBeInstanceOf(NotificationService);
    });

    it("initializes Resend client with API key from config", () => {
      expect(MockedResend).toHaveBeenCalledWith("re_test_api_key_123");
    });
  });

  describe("Resend Integration", () => {
    it("uses Resend SDK for sending emails", async () => {
      const to = "test@example.com";
      const subject = "Test";
      const message = "Test message";

      await notificationService.sendNotification(to, subject, message);

      expect(mockSend).toHaveBeenCalled();
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "onboarding@resend.dev",
          to,
          subject,
        })
      );
    });

    it("handles Resend API responses correctly", async () => {
      mockSend.mockResolvedValueOnce({
        id: "custom-email-id",
        data: { success: true },
        error: null,
      });

      await expect(
        notificationService.sendNotification(
          "test@example.com",
          "Test",
          "Message"
        )
      ).resolves.not.toThrow();
    });

    it("propagates Resend API errors", async () => {
      const apiError = new Error("Resend rate limit exceeded");
      mockSend.mockRejectedValueOnce(apiError);

      await expect(
        notificationService.sendNotification(
          "test@example.com",
          "Test",
          "Message"
        )
      ).rejects.toThrow("Failed to send email: Resend rate limit exceeded");
    });
  });

  describe("Configuration Validation", () => {
    it("verifies API key is configured", async () => {
      const result = await notificationService.verifyConnection();

      expect(result).toBe(true);
    });

    it("logs success message when API key is valid", async () => {
      await notificationService.verifyConnection();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Resend API key configured successfully"
      );
    });
  });
});
