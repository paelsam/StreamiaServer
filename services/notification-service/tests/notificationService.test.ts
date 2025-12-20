import { NotificationService } from "../src/services/notificationService";
import { config } from "../src/config";

describe("NotificationService - Pruebas Unitarias", () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = new NotificationService();
  });

  describe("Service Initialization", () => {
    it("crea una instancia de NotificationService correctamente", () => {
      expect(notificationService).toBeInstanceOf(NotificationService);
    });
  });

  // Pruebas unitarias básicas de métodos (mockeando dependencias si es necesario)
  describe("Métodos principales", () => {
    it("debería exponer el método sendNotification", () => {
      expect(typeof notificationService.sendNotification).toBe("function");
    });
    it("debería exponer el método sendWelcomeEmail", () => {
      expect(typeof notificationService.sendWelcomeEmail).toBe("function");
    });
    it("debería exponer el método sendPasswordResetEmail", () => {
      expect(typeof notificationService.sendPasswordResetEmail).toBe("function");
    });
    it("debería exponer el método verifyConnection", () => {
      expect(typeof notificationService.verifyConnection).toBe("function");
    });
  });

  // Puedes agregar más pruebas unitarias aquí según la lógica interna de NotificationService
});
