/**
 * Unit tests for utility functions
 */

import { describe, it, expect } from "vite-plus/test";

import { cn } from "@/lib/utils";
import { isValidEmail } from "@/lib/validation";

describe("Utility Functions", () => {
  describe("cn - className merger", () => {
    it("should merge simple class names", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("should handle conditional classes", () => {
      expect(cn("base", true && "active", false && "inactive")).toBe(
        "base active",
      );
    });

    it("should merge Tailwind classes correctly", () => {
      expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    });

    it("should handle undefined and null values", () => {
      expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
    });

    it("should handle empty strings", () => {
      expect(cn("foo", "", "bar")).toBe("foo bar");
    });

    it("should handle objects", () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
    });

    it("should handle arrays", () => {
      expect(cn(["foo", "bar"])).toBe("foo bar");
    });

    it("should merge conflicting Tailwind utilities", () => {
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
      expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
      expect(cn("p-4", "p-2")).toBe("p-2");
    });

    it("should handle mixed inputs", () => {
      expect(
        cn(
          "base-class",
          true && "conditional-class",
          { "object-class": true, "skipped-class": false },
          ["array-class-1", "array-class-2"],
        ),
      ).toBe(
        "base-class conditional-class object-class array-class-1 array-class-2",
      );
    });

    it("should return empty string for no arguments", () => {
      expect(cn()).toBe("");
    });

    it("should handle deeply nested arrays", () => {
      expect(cn(["foo", ["bar", ["baz"]]])).toBe("foo bar baz");
    });

    it("should handle responsive variants correctly", () => {
      expect(cn("md:text-lg", "md:text-xl")).toBe("md:text-xl");
      expect(cn("lg:p-4", "lg:p-8")).toBe("lg:p-8");
    });

    it("should handle dark mode variants correctly", () => {
      expect(cn("dark:bg-gray-800", "dark:bg-gray-900")).toBe(
        "dark:bg-gray-900",
      );
    });

    it("should preserve non-conflicting utilities", () => {
      expect(cn("text-red-500 font-bold", "text-lg")).toBe(
        "text-red-500 font-bold text-lg",
      );
    });
  });
});

describe("Email Validation Helpers", () => {
  it("should validate correct email addresses", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("user.name@example.com")).toBe(true);
    expect(isValidEmail("user+tag@example.com")).toBe(true);
    expect(isValidEmail("user@subdomain.example.com")).toBe(true);
  });

  it("should reject invalid email addresses", () => {
    expect(isValidEmail("invalid")).toBe(false);
    expect(isValidEmail("invalid@")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
    expect(isValidEmail("user@.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("user @example.com")).toBe(false);
  });
});

describe("String Helpers", () => {
  const truncate = (str: string, maxLength: number): string => {
    if (str.length <= maxLength) {
      return str;
    }
    return str.slice(0, maxLength - 3) + "...";
  };

  it("should not truncate short strings", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("should truncate long strings with ellipsis", () => {
    expect(truncate("hello world", 8)).toBe("hello...");
  });

  it("should handle edge cases", () => {
    expect(truncate("", 5)).toBe("");
    expect(truncate("abc", 3)).toBe("abc");
  });
});

describe("Date Helpers", () => {
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    }
    if (diffHours > 0) {
      return `${diffHours}h ago`;
    }
    if (diffMins > 0) {
      return `${diffMins}m ago`;
    }
    return "just now";
  };

  it('should format recent times as "just now"', () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe("just now");
  });

  it("should format minutes ago", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(fiveMinutesAgo)).toBe("5m ago");
  });

  it("should format hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatRelativeTime(twoHoursAgo)).toBe("2h ago");
  });

  it("should format days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeDaysAgo)).toBe("3d ago");
  });
});

describe("Array Helpers", () => {
  const unique = <T>(arr: T[]): T[] => [...new Set(arr)];

  const chunk = <T>(arr: T[], size: number): T[][] => {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  };

  describe("unique", () => {
    it("should remove duplicates from array", () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
    });

    it("should handle strings", () => {
      expect(unique(["a", "b", "a", "c"])).toEqual(["a", "b", "c"]);
    });

    it("should handle empty arrays", () => {
      expect(unique([])).toEqual([]);
    });
  });

  describe("chunk", () => {
    it("should split array into chunks", () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it("should handle exact division", () => {
      expect(chunk([1, 2, 3, 4], 2)).toEqual([
        [1, 2],
        [3, 4],
      ]);
    });

    it("should handle empty arrays", () => {
      expect(chunk([], 2)).toEqual([]);
    });

    it("should handle chunk size larger than array", () => {
      expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
    });
  });
});
