import { describe, it, expect } from "vite-plus/test";

import {
  aggregateClickData,
  getHeatColor,
  getHeatIntensityClass,
  calculateLinkCTR,
  getTopLinks,
  generateLinkPerformanceSummary,
  extractLinksFromContent,
  mergeHeatmapWithContent,
} from "@/lib/activity/heatmap";
import type { TrackingEvent, ClickHeatmapData } from "@/types/activity";

function makeEvent(overrides: Partial<TrackingEvent> = {}): TrackingEvent {
  return {
    $id: "evt-1",
    campaign_id: "camp-1",
    email: "r@example.com",
    event_type: "click",
    user_email: "sender@example.com",
    created_at: "2024-01-01T00:00:00.000Z",
    link_url: "https://example.com/a",
    ...overrides,
  };
}

describe("aggregateClickData", () => {
  it("returns zero totals for no events", () => {
    const result = aggregateClickData([], "camp-1");
    expect(result).toEqual({ campaignId: "camp-1", links: [], totalClicks: 0 });
  });

  it("ignores non-click events and events from other campaigns", () => {
    const events = [
      makeEvent({ event_type: "open" }),
      makeEvent({ campaign_id: "other-campaign" }),
    ];
    const result = aggregateClickData(events, "camp-1");
    expect(result.totalClicks).toBe(0);
    expect(result.links).toEqual([]);
  });

  it("ignores click events without a link_url", () => {
    const events = [makeEvent({ link_url: undefined })];
    const result = aggregateClickData(events, "camp-1");
    expect(result.links).toEqual([]);
    // totalClicks counts all click events for the campaign, including
    // ones lacking a link_url (they're just excluded from the links list).
    expect(result.totalClicks).toBe(1);
  });

  it("aggregates total/unique clicks per URL and sorts by clicks desc", () => {
    const events = [
      makeEvent({ link_url: "https://example.com/a", email: "a@example.com" }),
      makeEvent({ link_url: "https://example.com/a", email: "a@example.com" }), // same email again
      makeEvent({ link_url: "https://example.com/a", email: "b@example.com" }),
      makeEvent({ link_url: "https://example.com/b", email: "c@example.com" }),
    ];
    const result = aggregateClickData(events, "camp-1");

    expect(result.totalClicks).toBe(4);
    expect(result.links[0].url).toBe("https://example.com/a");
    expect(result.links[0].clicks).toBe(3);
    expect(result.links[0].uniqueClicks).toBe(2); // a@example.com, b@example.com
    expect(result.links[0].percentage).toBeCloseTo(75);
    expect(result.links[1].url).toBe("https://example.com/b");
    expect(result.links[1].clicks).toBe(1);
  });

  it("uses hostname+pathname (truncated) as displayText, falling back to the raw URL if unparseable", () => {
    const events = [
      makeEvent({ link_url: "https://example.com/some/path" }),
      makeEvent({ link_url: "not-a-valid-url", email: "x@example.com" }),
    ];
    const result = aggregateClickData(events, "camp-1");
    const valid = result.links.find(
      (l) => l.url === "https://example.com/some/path",
    );
    const invalid = result.links.find((l) => l.url === "not-a-valid-url");

    expect(valid?.displayText).toBe("example.com/some/path");
    expect(invalid?.displayText).toBe("not-a-valid-url");
  });
});

describe("getHeatColor / getHeatIntensityClass", () => {
  it("returns hot colors for high percentages and cool for low", () => {
    expect(getHeatColor(60)).toContain("hsl(0,");
    expect(getHeatColor(35)).toContain("hsl(25,");
    expect(getHeatColor(20)).toContain("hsl(45,");
    expect(getHeatColor(10)).toContain("hsl(120,");
    expect(getHeatColor(1)).toContain("hsl(200,");
  });

  it("returns matching Tailwind classes for the same thresholds", () => {
    expect(getHeatIntensityClass(60)).toContain("red");
    expect(getHeatIntensityClass(35)).toContain("orange");
    expect(getHeatIntensityClass(20)).toContain("yellow");
    expect(getHeatIntensityClass(10)).toContain("green");
    expect(getHeatIntensityClass(1)).toContain("blue");
  });
});

describe("calculateLinkCTR", () => {
  it("returns 0 when totalSent is 0", () => {
    expect(calculateLinkCTR(10, 0)).toBe(0);
  });

  it("computes percentage correctly", () => {
    expect(calculateLinkCTR(25, 100)).toBe(25);
  });
});

describe("getTopLinks", () => {
  const heatmap: ClickHeatmapData = {
    campaignId: "camp-1",
    totalClicks: 6,
    links: [
      { url: "a", clicks: 3, uniqueClicks: 3, percentage: 50 },
      { url: "b", clicks: 2, uniqueClicks: 2, percentage: 33 },
      { url: "c", clicks: 1, uniqueClicks: 1, percentage: 17 },
    ],
  };

  it("returns the top N links (default 5)", () => {
    expect(getTopLinks(heatmap).map((l) => l.url)).toEqual(["a", "b", "c"]);
  });

  it("respects a custom limit", () => {
    expect(getTopLinks(heatmap, 2).map((l) => l.url)).toEqual(["a", "b"]);
  });
});

describe("generateLinkPerformanceSummary", () => {
  it("summarizes an empty heatmap", () => {
    const summary = generateLinkPerformanceSummary({
      campaignId: "camp-1",
      totalClicks: 0,
      links: [],
    });
    expect(summary).toEqual({
      totalLinks: 0,
      totalClicks: 0,
      topLink: null,
      avgClicksPerLink: 0,
    });
  });

  it("summarizes a populated heatmap", () => {
    const heatmap: ClickHeatmapData = {
      campaignId: "camp-1",
      totalClicks: 10,
      links: [
        { url: "a", clicks: 6, uniqueClicks: 5, percentage: 60 },
        { url: "b", clicks: 4, uniqueClicks: 4, percentage: 40 },
      ],
    };
    const summary = generateLinkPerformanceSummary(heatmap);
    expect(summary.totalLinks).toBe(2);
    expect(summary.totalClicks).toBe(10);
    expect(summary.topLink?.url).toBe("a");
    expect(summary.avgClicksPerLink).toBe(5);
  });
});

describe("extractLinksFromContent", () => {
  it("returns an empty array for content with no links", () => {
    expect(extractLinksFromContent("<p>No links here</p>")).toEqual([]);
  });

  it("extracts href, inner text (stripped of tags), and position", () => {
    const html =
      '<p>See <a href="https://example.com">our <b>site</b></a> now.</p>';
    const links = extractLinksFromContent(html);

    expect(links).toHaveLength(1);
    expect(links[0].url).toBe("https://example.com");
    expect(links[0].text).toBe("our site");
    expect(links[0].position).toBe(html.indexOf("<a"));
  });

  it("extracts multiple links in order", () => {
    const html =
      '<a href="https://a.com">A</a> text <a href="https://b.com">B</a>';
    const links = extractLinksFromContent(html);
    expect(links.map((l) => l.url)).toEqual(["https://a.com", "https://b.com"]);
  });
});

describe("mergeHeatmapWithContent", () => {
  it("merges click data onto content links, defaulting to 0 when unmatched", () => {
    const heatmap: ClickHeatmapData = {
      campaignId: "camp-1",
      totalClicks: 5,
      links: [
        { url: "https://a.com", clicks: 5, uniqueClicks: 5, percentage: 100 },
      ],
    };
    const contentLinks = [
      { url: "https://a.com", text: "A", position: 0 },
      { url: "https://unknown.com", text: "B", position: 10 },
    ];

    const merged = mergeHeatmapWithContent(heatmap, contentLinks);

    expect(merged[0]).toMatchObject({
      url: "https://a.com",
      clicks: 5,
      percentage: 100,
    });
    expect(merged[1]).toMatchObject({
      url: "https://unknown.com",
      clicks: 0,
      percentage: 0,
    });
    expect(merged[0].heatClass).toContain("red");
    expect(merged[1].heatClass).toContain("blue");
  });
});
