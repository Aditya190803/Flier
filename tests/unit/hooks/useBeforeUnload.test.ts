/**
 * Unit tests for useBeforeUnload hook
 */

import { renderHook } from "@testing-library/react";
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vite-plus/test";

import { useBeforeUnload } from "@/hooks/useBeforeUnload";

describe("useBeforeUnload Hook", () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, "addEventListener");
    removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  describe("event listener management", () => {
    it("should add beforeunload listener when shouldWarn is true", () => {
      renderHook(() => useBeforeUnload(true));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function),
      );
    });

    it("should not add listener when shouldWarn is false", () => {
      renderHook(() => useBeforeUnload(false));

      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function),
      );
    });

    it("should remove listener on unmount", () => {
      const { unmount } = renderHook(() => useBeforeUnload(true));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function),
      );
    });

    it("should update listener when shouldWarn changes", () => {
      const { rerender } = renderHook(
        ({ shouldWarn }) => useBeforeUnload(shouldWarn),
        {
          initialProps: { shouldWarn: false },
        },
      );

      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function),
      );

      rerender({ shouldWarn: true });

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function),
      );
    });
  });

  describe("beforeunload event handling", () => {
    it("should prevent default and set returnValue when shouldWarn is true", () => {
      let capturedHandler: (e: BeforeUnloadEvent) => void = () => {};

      addEventListenerSpy.mockImplementation(
        (event: string, handler: EventListener) => {
          if (event === "beforeunload") {
            capturedHandler = handler as unknown as (
              e: BeforeUnloadEvent,
            ) => void;
          }
        },
      );

      renderHook(() => useBeforeUnload(true));

      const mockEvent = {
        preventDefault: vi.fn(),
        returnValue: "",
      } as unknown as BeforeUnloadEvent;

      capturedHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.returnValue).toBeTruthy();
    });

    it("should use custom message when provided", () => {
      const customMessage = "You have unsaved work!";
      let capturedHandler: (e: BeforeUnloadEvent) => void = () => {};

      addEventListenerSpy.mockImplementation(
        (event: string, handler: EventListener) => {
          if (event === "beforeunload") {
            capturedHandler = handler as unknown as (
              e: BeforeUnloadEvent,
            ) => void;
          }
        },
      );

      renderHook(() => useBeforeUnload(true, customMessage));

      const mockEvent = {
        preventDefault: vi.fn(),
        returnValue: "",
      } as unknown as BeforeUnloadEvent;

      const result = capturedHandler(mockEvent);

      expect(mockEvent.returnValue).toBe(customMessage);
      expect(result).toBe(customMessage);
    });

    it("should use default message when no custom message provided", () => {
      let capturedHandler: (e: BeforeUnloadEvent) => void = () => {};

      addEventListenerSpy.mockImplementation(
        (event: string, handler: EventListener) => {
          if (event === "beforeunload") {
            capturedHandler = handler as unknown as (
              e: BeforeUnloadEvent,
            ) => void;
          }
        },
      );

      renderHook(() => useBeforeUnload(true));

      const mockEvent = {
        preventDefault: vi.fn(),
        returnValue: "",
      } as unknown as BeforeUnloadEvent;

      capturedHandler(mockEvent);

      expect(mockEvent.returnValue).toContain("unsaved");
    });
  });

  describe("edge cases", () => {
    it("should handle rapid shouldWarn toggling", () => {
      const { rerender } = renderHook(
        ({ shouldWarn }) => useBeforeUnload(shouldWarn),
        {
          initialProps: { shouldWarn: true },
        },
      );

      rerender({ shouldWarn: false });
      rerender({ shouldWarn: true });
      rerender({ shouldWarn: false });
      rerender({ shouldWarn: true });

      // Should not throw and should have proper listener state
      expect(addEventListenerSpy).toHaveBeenCalled();
    });

    it("should handle empty message", () => {
      let capturedHandler: (e: BeforeUnloadEvent) => void = () => {};

      addEventListenerSpy.mockImplementation(
        (event: string, handler: EventListener) => {
          if (event === "beforeunload") {
            capturedHandler = handler as unknown as (
              e: BeforeUnloadEvent,
            ) => void;
          }
        },
      );

      renderHook(() => useBeforeUnload(true, ""));

      const mockEvent = {
        preventDefault: vi.fn(),
        returnValue: "",
      } as unknown as BeforeUnloadEvent;

      capturedHandler(mockEvent);

      // Should still set a default message
      expect(mockEvent.returnValue).toBeTruthy();
    });
  });
});
