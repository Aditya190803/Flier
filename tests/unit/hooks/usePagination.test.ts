/**
 * Unit tests for usePagination hook
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vite-plus/test";

import { usePagination, PAGE_SIZE_OPTIONS } from "@/hooks/usePagination";

describe("usePagination Hook", () => {
  const testItems = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
  }));

  describe("initialization", () => {
    it("should initialize with default options", () => {
      const { result } = renderHook(() => usePagination(testItems));

      expect(result.current.currentPage).toBe(1);
      expect(result.current.pageSize).toBe(10);
      expect(result.current.totalPages).toBe(10);
      expect(result.current.totalItems).toBe(100);
    });

    it("should initialize with custom options", () => {
      const { result } = renderHook(() =>
        usePagination(testItems, { pageSize: 25, initialPage: 2 }),
      );

      expect(result.current.currentPage).toBe(2);
      expect(result.current.pageSize).toBe(25);
      expect(result.current.totalPages).toBe(4);
    });

    it("should handle empty items array", () => {
      const { result } = renderHook(() => usePagination([]));

      expect(result.current.currentPage).toBe(1);
      expect(result.current.totalPages).toBe(1);
      expect(result.current.totalItems).toBe(0);
      expect(result.current.paginatedItems).toEqual([]);
    });
  });

  describe("pagination calculations", () => {
    it("should correctly paginate items", () => {
      const { result } = renderHook(() =>
        usePagination(testItems, { pageSize: 10 }),
      );

      expect(result.current.paginatedItems).toHaveLength(10);
      expect(result.current.paginatedItems[0]).toEqual({
        id: 1,
        name: "Item 1",
      });
      expect(result.current.paginatedItems[9]).toEqual({
        id: 10,
        name: "Item 10",
      });
    });

    it("should calculate start and end indices correctly", () => {
      const { result } = renderHook(() =>
        usePagination(testItems, { pageSize: 10 }),
      );

      expect(result.current.startIndex).toBe(0);
      expect(result.current.endIndex).toBe(9);
    });

    it("should handle last page with fewer items", () => {
      const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
      const { result } = renderHook(() =>
        usePagination(items, { pageSize: 10 }),
      );

      act(() => {
        result.current.goToPage(3);
      });

      expect(result.current.paginatedItems).toHaveLength(5);
      expect(result.current.startIndex).toBe(20);
      expect(result.current.endIndex).toBe(24);
    });
  });

  describe("navigation", () => {
    it("should navigate to next page", () => {
      const { result } = renderHook(() =>
        usePagination(testItems, { pageSize: 10 }),
      );

      act(() => {
        result.current.nextPage();
      });

      expect(result.current.currentPage).toBe(2);
      expect(result.current.paginatedItems[0]).toEqual({
        id: 11,
        name: "Item 11",
      });
    });

    it("should not go beyond last page", () => {
      const { result } = renderHook(() =>
        usePagination(testItems, { pageSize: 10, initialPage: 10 }),
      );

      act(() => {
        result.current.nextPage();
      });

      expect(result.current.currentPage).toBe(10);
    });

    it("should navigate to previous page", () => {
      const { result } = renderHook(() =>
        usePagination(testItems, { pageSize: 10, initialPage: 3 }),
      );

      act(() => {
        result.current.previousPage();
      });

      expect(result.current.currentPage).toBe(2);
    });

    it("should not go before first page", () => {
      const { result } = renderHook(() =>
        usePagination(testItems, { pageSize: 10 }),
      );

      act(() => {
        result.current.previousPage();
      });

      expect(result.current.currentPage).toBe(1);
    });

    it("should go to specific page", () => {
      const { result } = renderHook(() =>
        usePagination(testItems, { pageSize: 10 }),
      );

      act(() => {
        result.current.goToPage(5);
      });

      expect(result.current.currentPage).toBe(5);
    });

    it("should clamp page number to valid range", () => {
      const { result } = renderHook(() =>
        usePagination(testItems, { pageSize: 10 }),
      );

      act(() => {
        result.current.goToPage(100);
      });

      expect(result.current.currentPage).toBe(10);

      act(() => {
        result.current.goToPage(0);
      });

      expect(result.current.currentPage).toBe(1);
    });

    it("should go to first page", () => {
      const { result } = renderHook(() =>
        usePagination(testItems, { pageSize: 10, initialPage: 5 }),
      );

      act(() => {
        result.current.firstPage();
      });

      expect(result.current.currentPage).toBe(1);
    });

    it("should go to last page", () => {
      const { result } = renderHook(() =>
        usePagination(testItems, { pageSize: 10 }),
      );

      act(() => {
        result.current.lastPage();
      });

      expect(result.current.currentPage).toBe(10);
    });
  });

  describe("page size", () => {
    it("should change page size", () => {
      const { result } = renderHook(() =>
        usePagination(testItems, { pageSize: 10 }),
      );

      act(() => {
        result.current.setPageSize(25);
      });

      expect(result.current.pageSize).toBe(25);
      expect(result.current.totalPages).toBe(4);
    });

    it("should reset to first page when page size changes", () => {
      const { result } = renderHook(() =>
        usePagination(testItems, { pageSize: 10, initialPage: 5 }),
      );

      act(() => {
        result.current.setPageSize(25);
      });

      expect(result.current.currentPage).toBe(1);
    });
  });

  describe("navigation checks", () => {
    it("should correctly report hasPreviousPage", () => {
      const { result } = renderHook(() =>
        usePagination(testItems, { pageSize: 10 }),
      );

      expect(result.current.hasPreviousPage).toBe(false);

      act(() => {
        result.current.nextPage();
      });

      expect(result.current.hasPreviousPage).toBe(true);
    });

    it("should correctly report hasNextPage", () => {
      const { result } = renderHook(() =>
        usePagination(testItems, { pageSize: 10, initialPage: 10 }),
      );

      expect(result.current.hasNextPage).toBe(false);

      act(() => {
        result.current.previousPage();
      });

      expect(result.current.hasNextPage).toBe(true);
    });
  });

  describe("reset", () => {
    it("should reset to initial page", () => {
      const { result } = renderHook(() =>
        usePagination(testItems, { pageSize: 10, initialPage: 3 }),
      );

      act(() => {
        result.current.goToPage(7);
      });

      expect(result.current.currentPage).toBe(7);

      act(() => {
        result.current.reset();
      });

      expect(result.current.currentPage).toBe(3);
    });
  });

  describe("getPageNumbers", () => {
    it("should return all page numbers when total is less than max visible", () => {
      const items = Array.from({ length: 30 }, (_, i) => ({ id: i }));
      const { result } = renderHook(() =>
        usePagination(items, { pageSize: 10 }),
      );

      const pageNumbers = result.current.getPageNumbers(7);
      expect(pageNumbers).toEqual([1, 2, 3]);
    });

    it("should include ellipsis for many pages", () => {
      const items = Array.from({ length: 200 }, (_, i) => ({ id: i }));
      const { result } = renderHook(() =>
        usePagination(items, { pageSize: 10, initialPage: 10 }),
      );

      const pageNumbers = result.current.getPageNumbers(7);
      expect(pageNumbers).toContain(1);
      expect(pageNumbers).toContain(-1); // Ellipsis marker
      expect(pageNumbers).toContain(20);
    });

    it("should always include first and last page", () => {
      const items = Array.from({ length: 200 }, (_, i) => ({ id: i }));
      const { result } = renderHook(() =>
        usePagination(items, { pageSize: 10, initialPage: 10 }),
      );

      const pageNumbers = result.current.getPageNumbers(7);
      expect(pageNumbers[0]).toBe(1);
      expect(pageNumbers[pageNumbers.length - 1]).toBe(20);
    });
  });

  describe("server-side pagination", () => {
    it("should use external totalItems for calculations", () => {
      const items = Array.from({ length: 10 }, (_, i) => ({ id: i }));
      const { result } = renderHook(() =>
        usePagination(items, { pageSize: 10, totalItems: 100 }),
      );

      expect(result.current.totalItems).toBe(100);
      expect(result.current.totalPages).toBe(10);
      expect(result.current.hasNextPage).toBe(true);
    });
  });
});

describe("PAGE_SIZE_OPTIONS", () => {
  it("should have standard page size options", () => {
    expect(PAGE_SIZE_OPTIONS).toEqual([10, 25, 50, 100]);
  });
});
