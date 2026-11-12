// Shared by build-data.mjs and build-og.mjs: which values go on an entry's Open Graph image,
// and the file name derived from them. Bump OG_VERSION whenever the template changes.
import { createHash } from "node:crypto";

export const OG_VERSION = "2";
export const TEXT_MAX = 300;
export const SOURCE_MAX = 70;

const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** The values drawn on the image (already truncated), or null for entries that keep the generic image. */
export function ogContent(e) {
  if (e.sensitive) return null;
  const title = e.attested && e.sources?.[0]?.title ? String(e.sources[0].title) : "";
  return { text: clip(e.text, TEXT_MAX), source: title ? clip(title, SOURCE_MAX) : "" };
}

/** `<id>.<hash>.jpg`, or null for sensitive entries. */
export function ogFile(e) {
  const c = ogContent(e);
  if (!c) return null;
  const hash = createHash("sha256")
    .update(JSON.stringify([OG_VERSION, c.text, c.source]))
    .digest("hex")
    .slice(0, 10);
  return `${e.id}.${hash}.jpg`;
}
