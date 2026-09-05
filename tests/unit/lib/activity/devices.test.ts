import { describe, it, expect } from "vite-plus/test";

import { aggregateDeviceData } from "@/lib/activity/devices";
import type { TrackingEvent } from "@/types/activity";

function makeEvent(overrides: Partial<TrackingEvent> = {}): TrackingEvent {
  return {
    $id: "evt-1",
    campaign_id: "camp-1",
    email: "r@example.com",
    event_type: "open",
    user_email: "sender@example.com",
    created_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("aggregateDeviceData", () => {
  it("returns zeroed buckets for an empty events array", () => {
    expect(aggregateDeviceData([])).toEqual([
      { name: "Desktop", value: 0, color: "#3b82f6" },
      { name: "Mobile", value: 0, color: "#10b981" },
      { name: "Tablet", value: 0, color: "#f59e0b" },
    ]);
  });

  it("counts events with no user_agent as Desktop", () => {
    const result = aggregateDeviceData([makeEvent({ user_agent: undefined })]);
    const desktop = result.find((d) => d.name === "Desktop");
    expect(desktop?.value).toBe(1);
  });

  it("classifies iPhone/mobile user agents as Mobile", () => {
    const result = aggregateDeviceData([
      makeEvent({
        user_agent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148",
      }),
    ]);
    expect(result.find((d) => d.name === "Mobile")?.value).toBe(1);
  });

  it("classifies iPad as Tablet", () => {
    const result = aggregateDeviceData([
      makeEvent({
        user_agent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
      }),
    ]);
    expect(result.find((d) => d.name === "Tablet")?.value).toBe(1);
  });

  it("classifies Android without 'Mobile' token as Tablet", () => {
    const result = aggregateDeviceData([
      makeEvent({ user_agent: "Mozilla/5.0 (Linux; Android 10; SM-T510)" }),
    ]);
    expect(result.find((d) => d.name === "Tablet")?.value).toBe(1);
  });

  it("classifies Android with 'Mobile' token as Mobile", () => {
    const result = aggregateDeviceData([
      makeEvent({
        user_agent: "Mozilla/5.0 (Linux; Android 10; SM-G960U) Mobile Safari",
      }),
    ]);
    expect(result.find((d) => d.name === "Mobile")?.value).toBe(1);
  });

  it("classifies a standard desktop user agent as Desktop", () => {
    const result = aggregateDeviceData([
      makeEvent({
        user_agent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      }),
    ]);
    expect(result.find((d) => d.name === "Desktop")?.value).toBe(1);
  });

  it("aggregates a mix of devices across events", () => {
    const events = [
      makeEvent({ user_agent: "Windows desktop UA" }),
      makeEvent({ user_agent: "iPhone Mobile Safari" }),
      makeEvent({ user_agent: "iPad tablet UA" }),
      makeEvent({ user_agent: undefined }),
    ];
    const result = aggregateDeviceData(events);
    expect(result.find((d) => d.name === "Desktop")?.value).toBe(2);
    expect(result.find((d) => d.name === "Mobile")?.value).toBe(1);
    expect(result.find((d) => d.name === "Tablet")?.value).toBe(1);
  });
});
