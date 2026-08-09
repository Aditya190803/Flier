import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pollForUpdates } from "@/lib/appwrite/poll";

/** Drive `document.visibilityState`, which is read-only by default. */
function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("pollForUpdates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility("visible");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("invokes the callback once per interval", () => {
    const onChange = vi.fn();
    const stop = pollForUpdates(onChange, { intervalMs: 1000 });

    expect(onChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(onChange).toHaveBeenCalledTimes(3);

    stop();
  });

  it("stops firing after unsubscribe", () => {
    const onChange = vi.fn();
    const stop = pollForUpdates(onChange, { intervalMs: 1000 });

    vi.advanceTimersByTime(1000);
    expect(onChange).toHaveBeenCalledTimes(1);

    stop();
    vi.advanceTimersByTime(5000);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("skips ticks while the tab is hidden", () => {
    const onChange = vi.fn();
    const stop = pollForUpdates(onChange, { intervalMs: 1000 });

    // Suppress the visibility-change refresh so only ticks are counted.
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });

    vi.advanceTimersByTime(5000);
    expect(onChange).not.toHaveBeenCalled();

    stop();
  });

  it("refreshes immediately when the tab becomes visible again", () => {
    const onChange = vi.fn();
    const stop = pollForUpdates(onChange, { intervalMs: 10_000 });

    setVisibility("hidden");
    expect(onChange).not.toHaveBeenCalled();

    setVisibility("visible");
    expect(onChange).toHaveBeenCalledTimes(1);

    stop();
  });

  it("removes its visibility listener on unsubscribe", () => {
    const onChange = vi.fn();
    const stop = pollForUpdates(onChange, { intervalMs: 10_000 });

    stop();
    setVisibility("hidden");
    setVisibility("visible");

    expect(onChange).not.toHaveBeenCalled();
  });
});
