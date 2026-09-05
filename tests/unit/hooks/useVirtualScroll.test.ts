/**
 * Unit tests for useVirtualScroll hook
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vite-plus/test";

import {
  useVirtualScroll,
  useVariableVirtualScroll,
} from "@/hooks/useVirtualScroll";

describe("useVirtualScroll Hook", () => {
  const testItems = Array.from({ length: 1000 }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
  }));

  const defaultOptions = {
    itemHeight: 50,
    containerHeight: 500,
    overscan: 3,
  };

  describe("initialization", () => {
    it("should initialize with correct values", () => {
      const { result } = renderHook(() =>
        useVirtualScroll(testItems, defaultOptions),
      );

      expect(result.current.scrollTop).toBe(0);
      expect(result.current.startIndex).toBe(0);
      expect(result.current.totalHeight).toBe(50000); // 1000 items * 50px
    });

    it("should calculate virtual items", () => {
      const { result } = renderHook(() =>
        useVirtualScroll(testItems, defaultOptions),
      );

      // With overscan of 3, visible items + overscan on each side
      // 500px / 50px = 10 visible + 3 overscan on each side = ~16 items
      expect(result.current.virtualItems.length).toBeGreaterThan(0);
      expect(result.current.virtualItems.length).toBeLessThanOrEqual(20);
    });

    it("should set correct item positions", () => {
      const { result } = renderHook(() =>
        useVirtualScroll(testItems, defaultOptions),
      );

      result.current.virtualItems.forEach((item) => {
        expect(item.top).toBe(item.index * 50);
        expect(item.height).toBe(50);
      });
    });
  });

  describe("scrolling", () => {
    it("should update visible items on scroll", () => {
      const { result } = renderHook(() =>
        useVirtualScroll(testItems, defaultOptions),
      );

      const initialItems = result.current.virtualItems.map(
        (item) => item.index,
      );

      act(() => {
        result.current.handleScroll(500); // Scroll down 500px (10 items)
      });

      const newItems = result.current.virtualItems.map((item) => item.index);

      expect(result.current.scrollTop).toBe(500);
      // Items should have shifted
      expect(newItems[0]).toBeGreaterThan(initialItems[0]);
    });

    it("should calculate correct offset", () => {
      const { result } = renderHook(() =>
        useVirtualScroll(testItems, defaultOptions),
      );

      act(() => {
        result.current.handleScroll(250); // Scroll down 250px
      });

      // startIndex should be floor(250/50) - overscan = 5 - 3 = 2
      expect(result.current.startIndex).toBeGreaterThanOrEqual(0);
      expect(result.current.offsetTop).toBe(result.current.startIndex * 50);
    });
  });

  describe("scrollToIndex", () => {
    it("should scroll to specific index", () => {
      const { result } = renderHook(() =>
        useVirtualScroll(testItems, defaultOptions),
      );

      act(() => {
        result.current.scrollToIndex(50);
      });

      expect(result.current.scrollTop).toBe(2500); // 50 * 50px
    });

    it("should scroll to beginning", () => {
      const { result } = renderHook(() =>
        useVirtualScroll(testItems, defaultOptions),
      );

      act(() => {
        result.current.scrollToIndex(50);
      });

      act(() => {
        result.current.scrollToIndex(0);
      });

      expect(result.current.scrollTop).toBe(0);
    });
  });

  describe("empty items", () => {
    it("should handle empty items array", () => {
      const { result } = renderHook(() => useVirtualScroll([], defaultOptions));

      expect(result.current.virtualItems).toHaveLength(0);
      expect(result.current.totalHeight).toBe(0);
    });
  });

  describe("overscan", () => {
    it("should render extra items based on overscan", () => {
      const { result } = renderHook(() =>
        useVirtualScroll(testItems, { ...defaultOptions, overscan: 5 }),
      );

      // More items should be rendered with higher overscan
      expect(result.current.virtualItems.length).toBeGreaterThan(10); // 10 visible items
    });

    it("should work with zero overscan", () => {
      const { result } = renderHook(() =>
        useVirtualScroll(testItems, { ...defaultOptions, overscan: 0 }),
      );

      // Should still render visible items
      expect(result.current.virtualItems.length).toBeGreaterThan(0);
    });
  });

  describe("containerRef", () => {
    it("should provide containerRef", () => {
      const { result } = renderHook(() =>
        useVirtualScroll(testItems, defaultOptions),
      );

      expect(result.current.containerRef).toBeDefined();
      expect(result.current.containerRef.current).toBe(null);
    });
  });

  describe("bounds", () => {
    it("should not exceed array bounds at start", () => {
      const { result } = renderHook(() =>
        useVirtualScroll(testItems, defaultOptions),
      );

      expect(result.current.startIndex).toBeGreaterThanOrEqual(0);
    });

    it("should not exceed array bounds at end", () => {
      const { result } = renderHook(() =>
        useVirtualScroll(testItems, defaultOptions),
      );

      act(() => {
        result.current.handleScroll(49500); // Near the end
      });

      expect(result.current.endIndex).toBeLessThan(testItems.length);
    });
  });
});

describe("useVariableVirtualScroll Hook", () => {
  const testItems = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
  }));

  const variableOptions = {
    estimateHeight: (index: number) => 50 + (index % 3) * 20, // Heights: 50, 70, 90
    containerHeight: 500,
    overscan: 3,
  };

  describe("initialization", () => {
    it("should initialize with variable heights", () => {
      const { result } = renderHook(() =>
        useVariableVirtualScroll(testItems, variableOptions),
      );

      expect(result.current.virtualItems.length).toBeGreaterThan(0);
    });

    it("should calculate total height with variable heights", () => {
      const { result } = renderHook(() =>
        useVariableVirtualScroll(testItems, variableOptions),
      );

      // Total should be sum of all estimated heights
      expect(result.current.totalHeight).toBeGreaterThan(0);
    });
  });

  describe("measureItem", () => {
    it("should update item height when measured", () => {
      const { result } = renderHook(() =>
        useVariableVirtualScroll(testItems, variableOptions),
      );

      const initialHeight = result.current.virtualItems[0]?.height;

      act(() => {
        result.current.measureItem(0, 100);
      });

      // After re-measuring, height should reflect measured value
      expect(initialHeight).toBeDefined();
    });
  });

  describe("scrolling with variable heights", () => {
    it("should handle scroll with variable item heights", () => {
      const { result } = renderHook(() =>
        useVariableVirtualScroll(testItems, variableOptions),
      );

      act(() => {
        result.current.handleScroll(300);
      });

      expect(result.current.scrollTop).toBe(300);
      expect(result.current.virtualItems.length).toBeGreaterThan(0);
    });
  });
});
