/**
 * Unit tests for useAuthGuard hook
 */
import { renderHook, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { describe, it, expect, vi, beforeEach } from "vite-plus/test";

import { useAuthGuard } from "@/hooks/useAuthGuard";

const { mockPush, mockSignOut } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signOut: mockSignOut,
}));

const mockUseSession = vi.mocked(useSession);
const defaultSignInRedirect = "/auth/signin?callbackUrl=%2F";

describe("useAuthGuard Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should return loading state initially", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "loading",
        update: vi.fn(),
      });

      const { result } = renderHook(() => useAuthGuard());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.session).toBeNull();
    });

    it("should return authenticated state when session exists", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            email: "test@example.com",
            name: "Test User",
          },
          accessToken: "mock-token",
          expires: "2099-01-01",
        },
        status: "authenticated",
        update: vi.fn(),
      });

      const { result } = renderHook(() => useAuthGuard());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe("test@example.com");
      expect(result.current.accessToken).toBe("mock-token");
    });
  });

  describe("unauthenticated handling", () => {
    it("should redirect to default path when unauthenticated", async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: vi.fn(),
      });

      renderHook(() => useAuthGuard());

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(defaultSignInRedirect);
      });
    });

    it("should redirect to custom path when specified", async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: vi.fn(),
      });

      renderHook(() => useAuthGuard({ redirectTo: "/login" }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/login");
      });
    });
  });

  describe("session error handling", () => {
    it("should detect session errors", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { email: "test@example.com" },
          error: "RefreshAccessTokenError",
          expires: "2099-01-01",
        },
        status: "authenticated",
        update: vi.fn(),
      });

      const { result } = renderHook(() => useAuthGuard());

      expect(result.current.hasSessionError).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("should auto sign out on session error by default", async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { email: "test@example.com" },
          error: "RefreshAccessTokenError",
          expires: "2099-01-01",
        },
        status: "authenticated",
        update: vi.fn(),
      });

      renderHook(() => useAuthGuard());

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledWith({
          callbackUrl: defaultSignInRedirect,
        });
      });
    });

    it("should just redirect when autoSignOut is false", async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { email: "test@example.com" },
          error: "RefreshAccessTokenError",
          expires: "2099-01-01",
        },
        status: "authenticated",
        update: vi.fn(),
      });

      renderHook(() => useAuthGuard({ autoSignOut: false }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(defaultSignInRedirect);
        expect(mockSignOut).not.toHaveBeenCalled();
      });
    });
  });

  describe("return values", () => {
    it("should expose router for navigation", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { email: "test@example.com", name: "Test" },
          accessToken: "token",
          expires: "2099-01-01",
        },
        status: "authenticated",
        update: vi.fn(),
      });

      const { result } = renderHook(() => useAuthGuard());

      expect(result.current.router).toBeDefined();
      expect(result.current.router.push).toBeDefined();
    });

    it("should correctly return session status", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { email: "test@example.com", name: "Test" },
          accessToken: "token",
          expires: "2099-01-01",
        },
        status: "authenticated",
        update: vi.fn(),
      });

      const { result } = renderHook(() => useAuthGuard());

      expect(result.current.status).toBe("authenticated");
    });
  });
});
