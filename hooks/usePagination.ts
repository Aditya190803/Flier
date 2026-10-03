/**
 * Pagination Utility Hook
 * Provides pagination logic for lists with support for client-side and server-side pagination
 */

import { useState, useMemo, useCallback } from "react";

/**
 * Pagination configuration options
 */
export interface PaginationOptions {
  /** Items per page (default: 10) */
  pageSize?: number;
  /** Initial page (default: 1) */
  initialPage?: number;
  /** Total items count for server-side pagination */
  totalItems?: number;
}

/**
 * Pagination state and controls
 */
export interface PaginationState<T> {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items */
  totalItems: number;
  /** Whether there is a previous page */
  hasPreviousPage: boolean;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Paginated items for the current page */
  paginatedItems: T[];
  /** Go to a specific page */
  goToPage: (page: number) => void;
  /** Go to the next page */
  nextPage: () => void;
  /** Go to the previous page */
  previousPage: () => void;
  /** Go to the first page */
  firstPage: () => void;
  /** Go to the last page */
  lastPage: () => void;
  /** Change page size */
  setPageSize: (size: number) => void;
  /** Reset to first page */
  reset: () => void;
  /** Get page numbers for pagination UI */
  getPageNumbers: (maxVisible?: number) => number[];
  /** Start index of current page (0-indexed) */
  startIndex: number;
  /** End index of current page (0-indexed) */
  endIndex: number;
}

/**
 * Custom hook for pagination with client-side support
 * @param items - Array of items to paginate
 * @param options - Pagination options
 * @returns Pagination state and controls
 */
export function usePagination<T>(items: T[], options: PaginationOptions = {}): PaginationState<T> {
  const {
    pageSize: initialPageSize = 10,
    initialPage = 1,
    totalItems: externalTotalItems,
  } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Calculate total items (use external count for server-side pagination)
  const totalItems = externalTotalItems ?? items.length;

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalItems / pageSize));
  }, [totalItems, pageSize]);

  // Ensure current page is valid
  const validCurrentPage = useMemo(() => {
    return Math.min(Math.max(1, currentPage), totalPages);
  }, [currentPage, totalPages]);

  // Calculate paginated items
  const paginatedItems = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, validCurrentPage, pageSize]);

  // Calculate indices
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems) - 1;

  // Navigation checks
  const hasPreviousPage = validCurrentPage > 1;
  const hasNextPage = validCurrentPage < totalPages;

  // Navigation functions
  const goToPage = useCallback(
    (page: number) => {
      const validPage = Math.min(Math.max(1, page), totalPages);
      setCurrentPage(validPage);
    },
    [totalPages],
  );

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [hasPreviousPage]);

  const firstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const lastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when page size changes
  }, []);

  const reset = useCallback(() => {
    setCurrentPage(initialPage);
  }, [initialPage]);

  // Generate page numbers for UI with ellipsis support
  const getPageNumbers = useCallback(
    (maxVisible: number = 7): number[] => {
      if (totalPages <= maxVisible) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }

      const pages: number[] = [];
      const sidePages = Math.floor((maxVisible - 3) / 2);

      // Always show first page
      pages.push(1);

      if (validCurrentPage > sidePages + 2) {
        pages.push(-1); // Ellipsis marker
      }

      const start = Math.max(2, validCurrentPage - sidePages);
      const end = Math.min(totalPages - 1, validCurrentPage + sidePages);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (validCurrentPage < totalPages - sidePages - 1) {
        pages.push(-1); // Ellipsis marker
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }

      return pages;
    },
    [totalPages, validCurrentPage],
  );

  return {
    currentPage: validCurrentPage,
    totalPages,
    pageSize,
    totalItems,
    hasPreviousPage,
    hasNextPage,
    paginatedItems,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    setPageSize: handleSetPageSize,
    reset,
    getPageNumbers,
    startIndex,
    endIndex,
  };
}

/**
 * Page size options for UI
 */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];
