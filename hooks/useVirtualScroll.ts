/**
 * Virtual Scrolling Hook
 * Provides efficient rendering for large lists by only rendering visible items
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";

/**
 * Configuration options for virtual scrolling
 */
export interface VirtualScrollOptions {
  /** Height of each item in pixels */
  itemHeight: number;
  /** Height of the container in pixels */
  containerHeight: number;
  /** Number of items to render above/below visible area */
  overscan?: number;
}

/**
 * Virtual scroll state
 */
export interface VirtualScrollState<T> {
  /** Items to render in the viewport */
  virtualItems: VirtualItem<T>[];
  /** Total height of all items */
  totalHeight: number;
  /** Offset from top for the virtual window */
  offsetTop: number;
  /** Current scroll position */
  scrollTop: number;
  /** Start index of visible items */
  startIndex: number;
  /** End index of visible items */
  endIndex: number;
  /** Handler for scroll events */
  handleScroll: (scrollTop: number) => void;
  /** Scroll to a specific index */
  scrollToIndex: (index: number) => void;
  /** Container ref to attach to the scrollable element */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * A virtual item with position information
 */
export interface VirtualItem<T> {
  /** The actual item data */
  data: T;
  /** Index in the original array */
  index: number;
  /** Top offset position in pixels */
  top: number;
  /** Height of the item */
  height: number;
}

/**
 * Custom hook for virtual scrolling
 * @param items - Array of items to virtualize
 * @param options - Virtual scroll configuration
 * @returns Virtual scroll state and controls
 */
export function useVirtualScroll<T>(
  items: T[],
  options: VirtualScrollOptions,
): VirtualScrollState<T> {
  const { itemHeight, containerHeight, overscan = 3 } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate total height
  const totalHeight = items.length * itemHeight;

  // Calculate visible range
  const { startIndex, endIndex } = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(items.length - 1, start + visibleCount + overscan * 2);

    return { startIndex: start, endIndex: end };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Calculate offset for positioned items
  const offsetTop = startIndex * itemHeight;

  // Create virtual items
  const virtualItems: VirtualItem<T>[] = useMemo(() => {
    const result: VirtualItem<T>[] = [];

    for (let i = startIndex; i <= endIndex && i < items.length; i++) {
      result.push({
        data: items[i],
        index: i,
        top: i * itemHeight,
        height: itemHeight,
      });
    }

    return result;
  }, [items, startIndex, endIndex, itemHeight]);

  // Handle scroll events
  const handleScroll = useCallback((newScrollTop: number) => {
    setScrollTop(newScrollTop);
  }, []);

  // Scroll to specific index
  const scrollToIndex = useCallback(
    (index: number) => {
      const targetTop = index * itemHeight;
      if (containerRef.current) {
        containerRef.current.scrollTop = targetTop;
      }
      setScrollTop(targetTop);
    },
    [itemHeight],
  );

  // Attach scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const onScroll = () => {
      handleScroll(container.scrollTop);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [handleScroll]);

  return {
    virtualItems,
    totalHeight,
    offsetTop,
    scrollTop,
    startIndex,
    endIndex,
    handleScroll,
    scrollToIndex,
    containerRef,
  };
}

/**
 * Variable height virtual scrolling hook
 * For lists where items have different heights
 */
export interface VariableHeightOptions {
  /** Function to estimate item height (used before measurement) */
  estimateHeight: (index: number) => number;
  /** Height of the container */
  containerHeight: number;
  /** Number of items to render above/below visible area */
  overscan?: number;
}

interface MeasuredItem {
  offset: number;
  height: number;
  measured: boolean;
}

export function useVariableVirtualScroll<T>(
  items: T[],
  options: VariableHeightOptions,
): VirtualScrollState<T> & {
  measureItem: (index: number, height: number) => void;
} {
  const { estimateHeight, containerHeight, overscan = 3 } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const measuredItemsRef = useRef<Map<number, MeasuredItem>>(new Map());

  // Get or estimate item position
  const getItemOffset = useCallback(
    (index: number): number => {
      let offset = 0;
      for (let i = 0; i < index; i++) {
        const measured = measuredItemsRef.current.get(i);
        offset += measured?.height ?? estimateHeight(i);
      }
      return offset;
    },
    [estimateHeight],
  );

  // Get or estimate item height
  const getItemHeight = useCallback(
    (index: number): number => {
      return measuredItemsRef.current.get(index)?.height ?? estimateHeight(index);
    },
    [estimateHeight],
  );

  // Calculate total height
  const totalHeight = useMemo(() => {
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += getItemHeight(i);
    }
    return total;
  }, [items.length, getItemHeight]);

  // Find visible range using binary search
  const { startIndex, endIndex } = useMemo(() => {
    // Find start index
    let start = 0;
    let offset = 0;
    while (start < items.length && offset + getItemHeight(start) < scrollTop) {
      offset += getItemHeight(start);
      start++;
    }
    start = Math.max(0, start - overscan);

    // Find end index
    let end = start;
    let viewportOffset = getItemOffset(start);
    while (end < items.length && viewportOffset < scrollTop + containerHeight) {
      viewportOffset += getItemHeight(end);
      end++;
    }
    end = Math.min(items.length - 1, end + overscan);

    return { startIndex: start, endIndex: end };
  }, [scrollTop, containerHeight, items.length, getItemHeight, getItemOffset, overscan]);

  const offsetTop = getItemOffset(startIndex);

  // Create virtual items
  const virtualItems: VirtualItem<T>[] = useMemo(() => {
    const result: VirtualItem<T>[] = [];

    for (let i = startIndex; i <= endIndex && i < items.length; i++) {
      result.push({
        data: items[i],
        index: i,
        top: getItemOffset(i),
        height: getItemHeight(i),
      });
    }

    return result;
  }, [items, startIndex, endIndex, getItemOffset, getItemHeight]);

  // Measure an item after it renders
  const measureItem = useCallback(
    (index: number, height: number) => {
      const existing = measuredItemsRef.current.get(index);
      if (!existing || existing.height !== height) {
        measuredItemsRef.current.set(index, {
          offset: getItemOffset(index),
          height,
          measured: true,
        });
      }
    },
    [getItemOffset],
  );

  const handleScroll = useCallback((newScrollTop: number) => {
    setScrollTop(newScrollTop);
  }, []);

  const scrollToIndex = useCallback(
    (index: number) => {
      const targetTop = getItemOffset(index);
      if (containerRef.current) {
        containerRef.current.scrollTop = targetTop;
      }
      setScrollTop(targetTop);
    },
    [getItemOffset],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const onScroll = () => {
      handleScroll(container.scrollTop);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [handleScroll]);

  return {
    virtualItems,
    totalHeight,
    offsetTop,
    scrollTop,
    startIndex,
    endIndex,
    handleScroll,
    scrollToIndex,
    containerRef,
    measureItem,
  };
}
