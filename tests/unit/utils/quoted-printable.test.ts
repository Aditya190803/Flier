import { describe, expect, it } from "vite-plus/test";

import { encodeQuotedPrintable } from "@/lib/gmail";

type Decoder = (input: string) => string;

const decodeQuotedPrintable: Decoder = (input) => {
  // Remove soft line breaks first
  const compact = input.replace(/=\r?\n/g, "");
  const bytes: number[] = [];

  for (let i = 0; i < compact.length; i++) {
    const char = compact[i];
    const maybeHex = compact.slice(i + 1, i + 3);
    if (char === "=" && /^[0-9A-Fa-f]{2}$/.test(maybeHex)) {
      bytes.push(parseInt(maybeHex, 16));
      i += 2;
      continue;
    }

    bytes.push(compact.charCodeAt(i));
  }

  return Buffer.from(bytes).toString("utf8");
};

describe("encodeQuotedPrintable", () => {
  it("preserves links, bold text, and emoji when decoded", () => {
    const html =
      '<div><strong>Bold</strong> copy with <a href="https://example.com/path/that/is/really/really/long/and/should/wrap/properly?utm_source=test&utm_medium=email&utm_campaign=qp">link</a> and a smile 😊</div>';

    const encoded = encodeQuotedPrintable(html);
    const decoded = decodeQuotedPrintable(encoded);

    expect(decoded).toBe(html);
    expect(encoded).toContain("=3D");
    expect(encoded).toMatch(/=\r?\n/);
  });

  it("encodes trailing spaces so clients do not strip them", () => {
    const encoded = encodeQuotedPrintable("Line with spaces  \nNext line");
    const firstLine = encoded.split(/\r?\n/)[0];

    expect(firstLine.endsWith("=20=20")).toBe(true);
  });
});
