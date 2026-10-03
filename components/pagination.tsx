"use client";

import React from "react";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS } from "@/hooks/usePagination";

/**
 * Props for the Pagination component
 */
interface PaginationProps {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Current page size */
  pageSize: number;
  /** Total number of items */
  totalItems: number;
  /** Whether there is a previous page */
  hasPreviousPage: boolean;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Handler to go to a specific page */
  onPageChange: (page: number) => void;
  /** Handler to change page size */
  onPageSizeChange: (size: number) => void;
  /** Function to get page numbers for display */
  getPageNumbers: (maxVisible?: number) => number[];
  /** Start index of current items (0-indexed) */
  startIndex: number;
  /** End index of current items (0-indexed) */
  endIndex: number;
  /** Show page size selector (default: true) */
  showPageSize?: boolean;
  /** Show item count info (default: true) */
  showItemCount?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Reusable Pagination Component
 * Provides navigation controls for paginated lists
 */
export function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  hasPreviousPage,
  hasNextPage,
  onPageChange,
  onPageSizeChange,
  getPageNumbers,
  startIndex,
  endIndex,
  showPageSize = true,
  showItemCount = true,
  className = "",
}: PaginationProps) {
  const pageNumbers = getPageNumbers(7);

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Item count info */}
      {showItemCount && (
        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1} to {Math.min(endIndex + 1, totalItems)} of {totalItems} items
        </div>
      )}

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Page size selector */}
        {showPageSize && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">Items per page:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Page navigation */}
        <div className="flex items-center gap-1">
          {/* First page button */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={!hasPreviousPage}
            aria-label="Go to first page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Previous page button */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!hasPreviousPage}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page numbers */}
          <div className="hidden sm:flex items-center gap-1">
            {pageNumbers.map((page, index) => {
              if (page === -1) {
                // Ellipsis
                return (
                  <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                    ...
                  </span>
                );
              }

              return (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onPageChange(page)}
                  aria-label={`Go to page ${page}`}
                  aria-current={page === currentPage ? "page" : undefined}
                >
                  {page}
                </Button>
              );
            })}
          </div>

          {/* Mobile page indicator */}
          <span className="sm:hidden px-3 text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>

          {/* Next page button */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!hasNextPage}
            aria-label="Go to next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last page button */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={!hasNextPage}
            aria-label="Go to last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Alias for backward compatibility
export { Pagination as PaginationControls };

/**
 * Compact pagination for smaller spaces
 */
export function PaginationCompact({
  currentPage,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  onPageChange,
  className = "",
}: Pick<
  PaginationProps,
  "currentPage" | "totalPages" | "hasPreviousPage" | "hasNextPage" | "onPageChange" | "className"
>) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPreviousPage}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Previous
      </Button>
      <span className="text-sm text-muted-foreground px-2">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage}
        aria-label="Next page"
      >
        Next
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
