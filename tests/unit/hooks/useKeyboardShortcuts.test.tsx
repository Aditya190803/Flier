/**
 * Unit tests for useKeyboardShortcuts hook
 */
import React from "react";

import { renderHook, act, render } from "@testing-library/react";
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vite-plus/test";

const { mockPush, mockToast } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockToast: {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: mockToast,
}));

import {
  useKeyboardShortcuts,
  useComposeShortcuts,
  KeyboardShortcutsProvider,
} from "@/hooks/useKeyboardShortcuts";

describe("useKeyboardShortcuts Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any event listeners
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should return shortcuts array and showShortcutsHelp function", () => {
      const { result } = renderHook(() => useKeyboardShortcuts());

      expect(Array.isArray(result.current.shortcuts)).toBe(true);
      expect(typeof result.current.showShortcutsHelp).toBe("function");
    });

    it("should include default shortcuts", () => {
      const { result } = renderHook(() => useKeyboardShortcuts());

      const shortcutKeys = result.current.shortcuts.map((s) => ({
        key: s.key,
        ctrl: s.ctrl,
        shift: s.shift,
      }));

      // Check for new campaign shortcut (Ctrl+Shift+N)
      expect(shortcutKeys).toContainEqual({
        key: "n",
        ctrl: true,
        shift: true,
      });
      // Check for dashboard shortcut (Ctrl+Shift+H)
      expect(shortcutKeys).toContainEqual({
        key: "h",
        ctrl: true,
        shift: true,
      });
    });

    it("should merge custom shortcuts with defaults", () => {
      const customShortcuts = [
        {
          key: "x",
          ctrl: true,
          description: "Custom Action",
          action: vi.fn(),
        },
      ];

      const { result } = renderHook(() =>
        useKeyboardShortcuts(customShortcuts),
      );

      const hasCustom = result.current.shortcuts.some(
        (s) => s.key === "x" && s.ctrl === true,
      );
      expect(hasCustom).toBe(true);
    });
  });

  describe("keyboard event handling", () => {
    it("should trigger action on matching shortcut", () => {
      const customAction = vi.fn();
      const customShortcuts = [
        {
          key: "t",
          ctrl: true,
          description: "Test Action",
          action: customAction,
        },
      ];

      renderHook(() => useKeyboardShortcuts(customShortcuts));

      const event = new KeyboardEvent("keydown", {
        key: "t",
        ctrlKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(customAction).toHaveBeenCalled();
    });

    it("should not trigger when typing in input fields", () => {
      const customAction = vi.fn();
      const customShortcuts = [
        {
          key: "t",
          ctrl: false,
          description: "Test Action",
          action: customAction,
        },
      ];

      renderHook(() => useKeyboardShortcuts(customShortcuts));

      // Create an input element and set it as target
      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();

      const event = new KeyboardEvent("keydown", {
        key: "t",
        bubbles: true,
      });
      Object.defineProperty(event, "target", { value: input, writable: false });
      input.dispatchEvent(event);

      // Should not trigger because we're in an input
      expect(customAction).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });

    it("should match shift modifier correctly", () => {
      const customAction = vi.fn();
      const customShortcuts = [
        {
          key: "s",
          ctrl: true,
          shift: true,
          description: "Shift Action",
          action: customAction,
        },
      ];

      renderHook(() => useKeyboardShortcuts(customShortcuts));

      // Without shift - should not trigger
      const eventWithoutShift = new KeyboardEvent("keydown", {
        key: "s",
        ctrlKey: true,
        shiftKey: false,
        bubbles: true,
      });
      window.dispatchEvent(eventWithoutShift);
      expect(customAction).not.toHaveBeenCalled();

      // With shift - should trigger
      const eventWithShift = new KeyboardEvent("keydown", {
        key: "s",
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      });
      window.dispatchEvent(eventWithShift);
      expect(customAction).toHaveBeenCalled();
    });

    it("should navigate to compose on Ctrl+Shift+N", () => {
      renderHook(() => useKeyboardShortcuts());

      const event = new KeyboardEvent("keydown", {
        key: "n",
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(mockPush).toHaveBeenCalledWith("/compose");
    });
  });

  describe("showShortcutsHelp", () => {
    it("should show toast with shortcuts info", () => {
      const { result } = renderHook(() => useKeyboardShortcuts());

      act(() => {
        result.current.showShortcutsHelp();
      });

      expect(mockToast.info).toHaveBeenCalledWith(
        "Keyboard Shortcuts",
        expect.objectContaining({
          duration: 10000,
        }),
      );
    });
  });
});

describe("useComposeShortcuts Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should provide compose-specific shortcuts", () => {
    const options = {
      onSend: vi.fn(),
      onSave: vi.fn(),
      onPreview: vi.fn(),
      canSend: true,
    };

    const { result } = renderHook(() => useComposeShortcuts(options));

    // Should have send shortcut (Ctrl+Enter)
    const sendShortcut = result.current.shortcuts.find(
      (s) => s.key === "Enter" && s.ctrl,
    );
    expect(sendShortcut).toBeDefined();

    // Should have save shortcut (Ctrl+S)
    const saveShortcut = result.current.shortcuts.find(
      (s) => s.key === "s" && s.ctrl && !s.shift,
    );
    expect(saveShortcut).toBeDefined();
  });

  it("should call onSend when canSend is true", () => {
    const onSend = vi.fn();
    const options = {
      onSend,
      canSend: true,
    };

    renderHook(() => useComposeShortcuts(options));

    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(onSend).toHaveBeenCalled();
  });

  it("should show warning when canSend is false", () => {
    const onSend = vi.fn();
    const options = {
      onSend,
      canSend: false,
    };

    renderHook(() => useComposeShortcuts(options));

    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(onSend).not.toHaveBeenCalled();
    expect(mockToast.warning).toHaveBeenCalled();
  });

  it("should call onSave and show success toast on Ctrl+S", () => {
    const onSave = vi.fn();
    const options = { onSave };

    renderHook(() => useComposeShortcuts(options));

    const event = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(onSave).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalledWith("Draft saved");
  });
});

describe("KeyboardShortcutsProvider", () => {
  it("should render children", () => {
    const { container } = render(
      <KeyboardShortcutsProvider>
        <div data-testid="child">Child Content</div>
      </KeyboardShortcutsProvider>,
    );

    expect(container.querySelector('[data-testid="child"]')).toBeTruthy();
  });
});
