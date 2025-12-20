import { UserService } from "../src/services/userService";
import { User } from "../src/models/User";
import { EventBus } from "@streamia/shared";
import * as redis from "../src/config/redis";
import jwt from "jsonwebtoken";

jest.mock("../src/models/User");
jest.mock("@streamia/shared");
jest.mock("../src/config/redis");
jest.mock("jsonwebtoken");

describe("UserService", () => {
  let userService: UserService;
  let mockEventBus: jest.Mocked<EventBus>;

  const mockUser = {
    _id: { toString: () => "user123" },
    email: "test@test.com",
    username: "testuser",
    password: "hashedPassword",
    refreshTokens: [] as string[],
    toJSON: jest.fn().mockReturnValue({
      id: "user123",
      email: "test@test.com",
      username: "testuser",
    }),
    comparePassword: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    userService = new UserService(mockEventBus);

    // Setup default jwt mocks
    (jwt.sign as jest.Mock).mockReturnValue("mock-token");
    (jwt.verify as jest.Mock).mockReturnValue({ userId: "user123", email: "test@test.com" });
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      const newUser = {
        ...mockUser,
        refreshTokens: [],
        save: jest.fn().mockResolvedValue(undefined),
      };
      
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User as unknown as jest.Mock).mockImplementation(() => newUser);

      const result = await userService.register({
        email: "test@test.com",
        username: "testuser",
        password: "password123",
      });

      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBe("mock-token");
      expect(result.tokens.refreshToken).toBe("mock-token");
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it("should throw error if email already exists", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        userService.register({
          email: "test@test.com",
          username: "testuser",
          password: "password123",
        })
      ).rejects.toThrow("Email already registered");
    });
  });

  describe("login", () => {
    it("should login user with valid credentials", async () => {
      const userWithCompare = {
        ...mockUser,
        refreshTokens: [],
        comparePassword: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(undefined),
      };
      (User.findOne as jest.Mock).mockResolvedValue(userWithCompare);

      const result = await userService.login({
        email: "test@test.com",
        password: "password123",
      });

      expect(result.user).toBeDefined();
      expect(result.tokens.accessToken).toBe("mock-token");
      expect(userWithCompare.comparePassword).toHaveBeenCalledWith("password123");
    });

    it("should throw error with invalid email", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        userService.login({
          email: "invalid@test.com",
          password: "password123",
        })
      ).rejects.toThrow("Invalid credentials");
    });

    it("should throw error with invalid password", async () => {
      const userWithCompare = {
        ...mockUser,
        comparePassword: jest.fn().mockResolvedValue(false),
      };
      (User.findOne as jest.Mock).mockResolvedValue(userWithCompare);

      await expect(
        userService.login({
          email: "test@test.com",
          password: "wrongpassword",
        })
      ).rejects.toThrow("Invalid credentials");
    });
  });

  describe("logout", () => {
    it("should logout user and invalidate cache", async () => {
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUser);
      (redis.deleteCache as jest.Mock).mockResolvedValue(undefined);

      await userService.logout("user123", "refresh-token");

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith("user123", {
        $pull: { refreshTokens: "refresh-token" },
      });
      expect(redis.deleteCache).toHaveBeenCalledWith("user:user123");
    });
  });

  describe("getProfile", () => {
    it("should return cached user if available", async () => {
      const cachedUser = { id: "user123", email: "test@test.com" };
      (redis.getCache as jest.Mock).mockResolvedValue(cachedUser);

      const result = await userService.getProfile("user123");

      expect(result).toEqual(cachedUser);
      expect(User.findById).not.toHaveBeenCalled();
    });

    it("should fetch user from DB if not cached", async () => {
      (redis.getCache as jest.Mock).mockResolvedValue(null);
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (redis.setCache as jest.Mock).mockResolvedValue(undefined);

      const result = await userService.getProfile("user123");

      expect(result).toEqual(mockUser);
      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(redis.setCache).toHaveBeenCalled();
    });

    it("should throw error if user not found", async () => {
      (redis.getCache as jest.Mock).mockResolvedValue(null);
      (User.findById as jest.Mock).mockResolvedValue(null);

      await expect(userService.getProfile("user123")).rejects.toThrow(
        "User not found"
      );
    });
  });

  describe("updateProfile", () => {
    it("should update user profile successfully", async () => {
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUser);
      (redis.deleteCache as jest.Mock).mockResolvedValue(undefined);

      const result = await userService.updateProfile("user123", {
        username: "newusername",
      });

      expect(result).toEqual(mockUser);
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        { $set: { username: "newusername" } },
        { new: true, runValidators: true }
      );
      expect(redis.deleteCache).toHaveBeenCalledWith("user:user123");
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it("should throw error if user not found", async () => {
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(
        userService.updateProfile("user123", { username: "newusername" })
      ).rejects.toThrow("User not found");
    });
  });

  describe("deleteAccount", () => {
    it("should delete user account successfully", async () => {
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (User.findByIdAndDelete as jest.Mock).mockResolvedValue(mockUser);
      (redis.deleteCache as jest.Mock).mockResolvedValue(undefined);

      await userService.deleteAccount("user123");

      expect(User.findByIdAndDelete).toHaveBeenCalledWith("user123");
      expect(redis.deleteCache).toHaveBeenCalledWith("user:user123");
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it("should throw error if user not found", async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);

      await expect(userService.deleteAccount("user123")).rejects.toThrow(
        "User not found"
      );
    });
  });

  describe("refreshToken", () => {
    it("should refresh tokens successfully", async () => {
      const userWithTokens = {
        ...mockUser,
        refreshTokens: ["valid-refresh-token"],
        save: jest.fn().mockResolvedValue(undefined),
      };
      (jwt.verify as jest.Mock).mockReturnValue({ userId: "user123", email: "test@test.com" });
      (User.findById as jest.Mock).mockResolvedValue(userWithTokens);

      const result = await userService.refreshToken({
        refreshToken: "valid-refresh-token",
      });

      expect(result.accessToken).toBe("mock-token");
      expect(result.refreshToken).toBe("mock-token");
    });

    it("should throw error with invalid refresh token", async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(
        userService.refreshToken({ refreshToken: "invalid-token" })
      ).rejects.toThrow("Invalid refresh token");
    });
  });

  describe("verifyAccessToken", () => {
    it("should verify a valid access token", () => {
      (jwt.verify as jest.Mock).mockReturnValue({ userId: "user123", email: "test@test.com" });

      const result = userService.verifyAccessToken("valid-token");

      expect(result).toEqual({ userId: "user123", email: "test@test.com" });
    });

    it("should throw error for invalid access token", () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid token");
      });

      expect(() => userService.verifyAccessToken("invalid-token")).toThrow(
        "Invalid access token"
      );
    });
  });
});
