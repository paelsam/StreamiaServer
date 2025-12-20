import request from "supertest";
import express from "express";
import { UserController } from "../src/controllers/userController";
import { UserService } from "../src/services/userService";

// Mock dependencies
jest.mock("../src/services/userService");
jest.mock("@streamia/shared", () => ({
  apiResponse: (res: any, status: number, data: any, message?: string) => {
    return res.status(status).json({ success: true, data, message });
  },
  errorResponse: (res: any, status: number, message: string) => {
    return res.status(status).json({ success: false, error: message });
  },
  asyncHandler: (fn: Function) => (req: any, res: any, next: any) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  },
  EventBus: jest.fn().mockImplementation(() => ({
    publish: jest.fn(),
    subscribe: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

describe("UserController", () => {
  let app: express.Express;
  let mockUserService: jest.Mocked<UserService>;
  let controller: UserController;

  const mockUser = {
    _id: "user123",
    email: "test@test.com",
    username: "testuser",
    toJSON: () => ({
      id: "user123",
      email: "test@test.com",
      username: "testuser",
    }),
  };

  const mockTokens = {
    accessToken: "access-token",
    refreshToken: "refresh-token",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserService = {
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      deleteAccount: jest.fn(),
      verifyAccessToken: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    controller = new UserController(mockUserService);

    app = express();
    app.use(express.json());

    // Mock auth middleware
    app.use((req: any, _res, next) => {
      req.userId = "user123";
      next();
    });

    // Setup routes
    app.post("/auth/register", controller.register);
    app.post("/auth/login", controller.login);
    app.post("/auth/logout", controller.logout);
    app.post("/auth/refresh", controller.refreshToken);
    app.post("/auth/forgot-password", controller.forgotPassword);
    app.post("/auth/reset-password", controller.resetPassword);
    app.get("/users/profile", controller.getProfile);
    app.put("/users/profile", controller.updateProfile);
    app.delete("/users/account", controller.deleteAccount);
  });

  describe("POST /auth/register", () => {
    it("should register a new user successfully", async () => {
      mockUserService.register.mockResolvedValue({
        user: mockUser as any,
        tokens: mockTokens,
      });

      const res = await request(app).post("/auth/register").send({
        email: "test@test.com",
        username: "testuser",
        password: "password123",
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe("test@test.com");
      expect(res.body.data.accessToken).toBe("access-token");
      expect(mockUserService.register).toHaveBeenCalled();
    });

    it("should return 400 on registration error", async () => {
      mockUserService.register.mockRejectedValue(
        new Error("Email already registered")
      );

      const res = await request(app).post("/auth/register").send({
        email: "existing@test.com",
        username: "testuser",
        password: "password123",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Email already registered");
    });
  });

  describe("POST /auth/login", () => {
    it("should login user successfully", async () => {
      mockUserService.login.mockResolvedValue({
        user: mockUser as any,
        tokens: mockTokens,
      });

      const res = await request(app).post("/auth/login").send({
        email: "test@test.com",
        password: "password123",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBe("access-token");
      expect(mockUserService.login).toHaveBeenCalled();
    });

    it("should return 401 on invalid credentials", async () => {
      mockUserService.login.mockRejectedValue(new Error("Invalid credentials"));

      const res = await request(app).post("/auth/login").send({
        email: "test@test.com",
        password: "wrongpassword",
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Invalid credentials");
    });
  });

  describe("POST /auth/logout", () => {
    it("should logout user successfully", async () => {
      mockUserService.logout.mockResolvedValue(undefined);

      const res = await request(app).post("/auth/logout").send({
        refreshToken: "refresh-token",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockUserService.logout).toHaveBeenCalledWith(
        "user123",
        "refresh-token"
      );
    });

    it("should return 400 on logout error", async () => {
      mockUserService.logout.mockRejectedValue(new Error("Logout failed"));

      const res = await request(app).post("/auth/logout").send({
        refreshToken: "invalid-token",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Logout failed");
    });
  });

  describe("POST /auth/refresh", () => {
    it("should refresh tokens successfully", async () => {
      mockUserService.refreshToken.mockResolvedValue(mockTokens);

      const res = await request(app).post("/auth/refresh").send({
        refreshToken: "valid-refresh-token",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBe("access-token");
    });

    it("should return 401 on invalid refresh token", async () => {
      mockUserService.refreshToken.mockRejectedValue(
        new Error("Invalid refresh token")
      );

      const res = await request(app).post("/auth/refresh").send({
        refreshToken: "invalid-token",
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid refresh token");
    });
  });

  describe("POST /auth/forgot-password", () => {
    it("should handle forgot password request", async () => {
      mockUserService.forgotPassword.mockResolvedValue(undefined);

      const res = await request(app).post("/auth/forgot-password").send({
        email: "test@test.com",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockUserService.forgotPassword).toHaveBeenCalled();
    });

    it("should always return 200 to prevent email enumeration", async () => {
      mockUserService.forgotPassword.mockRejectedValue(new Error("User not found"));

      const res = await request(app).post("/auth/forgot-password").send({
        email: "nonexistent@test.com",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("POST /auth/reset-password", () => {
    it("should reset password successfully", async () => {
      mockUserService.resetPassword.mockResolvedValue(undefined);

      const res = await request(app).post("/auth/reset-password").send({
        token: "valid-reset-token",
        password: "newpassword123",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockUserService.resetPassword).toHaveBeenCalled();
    });

    it("should return 400 on invalid reset token", async () => {
      mockUserService.resetPassword.mockRejectedValue(
        new Error("Invalid or expired reset token")
      );

      const res = await request(app).post("/auth/reset-password").send({
        token: "invalid-token",
        password: "newpassword123",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid or expired reset token");
    });
  });

  describe("GET /users/profile", () => {
    it("should return user profile", async () => {
      mockUserService.getProfile.mockResolvedValue(mockUser as any);

      const res = await request(app).get("/users/profile");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe("test@test.com");
      expect(mockUserService.getProfile).toHaveBeenCalledWith("user123");
    });

    it("should return 404 if user not found", async () => {
      mockUserService.getProfile.mockRejectedValue(new Error("User not found"));

      const res = await request(app).get("/users/profile");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("User not found");
    });
  });

  describe("PUT /users/profile", () => {
    it("should update user profile successfully", async () => {
      const updatedUser = {
        ...mockUser,
        username: "newusername",
        toJSON: () => ({
          id: "user123",
          email: "test@test.com",
          username: "newusername",
        }),
      };
      mockUserService.updateProfile.mockResolvedValue(updatedUser as any);

      const res = await request(app).put("/users/profile").send({
        username: "newusername",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.username).toBe("newusername");
      expect(mockUserService.updateProfile).toHaveBeenCalledWith("user123", {
        username: "newusername",
      });
    });

    it("should return 400 on update error", async () => {
      mockUserService.updateProfile.mockRejectedValue(
        new Error("Failed to update profile")
      );

      const res = await request(app).put("/users/profile").send({
        username: "newusername",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Failed to update profile");
    });
  });

  describe("DELETE /users/account", () => {
    it("should delete user account successfully", async () => {
      mockUserService.deleteAccount.mockResolvedValue(undefined);

      const res = await request(app).delete("/users/account");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockUserService.deleteAccount).toHaveBeenCalledWith("user123");
    });

    it("should return 400 on delete error", async () => {
      mockUserService.deleteAccount.mockRejectedValue(
        new Error("Failed to delete account")
      );

      const res = await request(app).delete("/users/account");

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Failed to delete account");
    });
  });
});
