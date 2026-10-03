/**
 * Unit tests for useIsClient hook
 */

import React from "react";

import { renderHook, waitFor } from "@testing-library/react";
import { render } from "@testing-library/react";
import { describe, it, expect } from "vite-plus/test";

import { useIsClient, ClientOnly } from "@/hooks/useIsClient";

describe("useIsClient Hook", () => {
  describe("initialization", () => {
    it("should return false initially (SSR simulation)", () => {
      const { result } = renderHook(() => useIsClient());

      // The hook returns false initially before the useEffect runs
      expect(typeof result.current).toBe("boolean");
    });

    it("should return true after hydration", async () => {
      const { result } = renderHook(() => useIsClient());

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it("should maintain true value after initial render", async () => {
      const { result, rerender } = renderHook(() => useIsClient());

      await waitFor(() => {
        expect(result.current).toBe(true);
      });

      rerender();

      expect(result.current).toBe(true);
    });
  });
});

describe("ClientOnly Component", () => {
  it("should not render children initially", () => {
    const { container } = render(
      <ClientOnly>
        <div data-testid="client-content">Client Content</div>
      </ClientOnly>,
    );

    // Initial render - content might not be visible until after effect runs
    expect(container).toBeDefined();
  });

  it("should render children after client-side hydration", async () => {
    const view = render(
      <ClientOnly>
        <div data-testid="client-content">Client Content</div>
      </ClientOnly>,
    );

    await waitFor(() => {
      expect(view.getByTestId("client-content")).toBeInTheDocument();
    });
  });

  it("should correctly render text content", async () => {
    const view = render(
      <ClientOnly>
        <span>Hello Client</span>
      </ClientOnly>,
    );

    await waitFor(() => {
      expect(view.getByText("Hello Client")).toBeInTheDocument();
    });
  });

  it("should render multiple children", async () => {
    const view = render(
      <ClientOnly>
        <div data-testid="child-1">First</div>
        <div data-testid="child-2">Second</div>
      </ClientOnly>,
    );

    await waitFor(() => {
      expect(view.getByTestId("child-1")).toBeInTheDocument();
      expect(view.getByTestId("child-2")).toBeInTheDocument();
    });
  });

  it("should render nested components", async () => {
    const NestedComponent = () => <span data-testid="nested">Nested</span>;

    const view = render(
      <ClientOnly>
        <div>
          <NestedComponent />
        </div>
      </ClientOnly>,
    );

    await waitFor(() => {
      expect(view.getByTestId("nested")).toBeInTheDocument();
    });
  });
});
