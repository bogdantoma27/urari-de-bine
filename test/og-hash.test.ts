import { describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs helper shared with the build scripts
import { ogFile } from "../scripts/og-hash.mjs";

const base = { id: "x", text: "Să crape!", sensitive: false, attested: true, sources: [{ title: "DEX" }] };

describe("og hash", () => {
  it("is stable and shaped <id>.<10 hex>.jpg", () => {
    expect(ogFile(base)).toBe(ogFile({ ...base }));
    expect(ogFile(base)).toMatch(/^x\.[0-9a-f]{10}\.jpg$/);
  });
  it("changes with the text or the source, not with unrelated fields", () => {
    expect(ogFile({ ...base, text: "Să crape și el!" })).not.toBe(ogFile(base));
    expect(ogFile({ ...base, sources: [{ title: "MDA" }] })).not.toBe(ogFile(base));
    expect(ogFile({ ...base, attested: false })).not.toBe(ogFile(base));
    expect(ogFile({ ...base, sources: [{ title: "DEX" }, { title: "other" }] })).toBe(ogFile(base));
  });
  it("is null for sensitive entries", () => {
    expect(ogFile({ ...base, sensitive: true })).toBeNull();
  });
});
