// Renders one 1200x630 Open Graph JPEG per non-sensitive entry into public/og/<id>.<hash>.jpg.
// Pure JS/WASM (satori -> resvg-wasm -> jpeg-js), so it runs the same on Windows and Linux.
// Files whose name (id + content hash, see og-hash.mjs) already exists are skipped; unreferenced ones are removed.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { availableParallelism } from "node:os";
import { ogContent, ogFile } from "./og-hash.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = join(root, "public", "og");
const require = createRequire(import.meta.url);

const W = 1200;
const H = 630;
const GOLD = "#c9a24d";
const GOLD_PALE = "#e6cf8f";
const PAPER = "#efe0bf";
const DIM = "#d8c391";
const KURALE = "Kurale, Kurale Ext";
const ALEGREYA = "Alegreya, Alegreya Ext";
const GRENZE = "Grenze Gotisch, Grenze Gotisch Ext";

const font = (pkg, file) => readFileSync(require.resolve(`@fontsource/${pkg}/files/${pkg}-${file}.woff`));
function loadFonts() {
  const f = [];
  // satori does not fall back between faces of one family, so latin-ext is a second family name listed after the first
  for (const [sub, suffix] of [["latin", ""], ["latin-ext", " Ext"]]) {
    f.push({ name: `Kurale${suffix}`, data: font("kurale", `${sub}-400-normal`), weight: 400, style: "normal" });
    f.push({ name: `Alegreya${suffix}`, data: font("alegreya", `${sub}-400-italic`), weight: 400, style: "italic" });
    f.push({ name: `Grenze Gotisch${suffix}`, data: font("grenze-gotisch", `${sub}-500-normal`), weight: 500, style: "normal" });
  }
  return f;
}

/** Font size by text length, so the text fits in about 1040x330. */
function textSize(n) {
  if (n <= 10) return 120;
  if (n <= 18) return 96;
  if (n <= 28) return 78;
  if (n <= 50) return 64;
  if (n <= 80) return 54;
  if (n <= 110) return 50;
  return 44;
}

const div = (style, children) => ({ type: "div", props: { style: { display: "flex", ...style }, children } });

function tree({ text, source }) {
  return div(
    {
      width: W,
      height: H,
      boxSizing: "border-box",
      position: "relative",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "62px 80px 56px",
      backgroundColor: "#2a1d14",
      backgroundImage: "radial-gradient(ellipse 75% 60% at 50% 0%, rgba(120,84,48,0.85) 0%, rgba(42,29,20,0) 100%)",
    },
    [
      div(
        { position: "absolute", left: 22, top: 22, width: W - 44, height: H - 44, border: "1px solid rgba(201,162,77,0.4)", borderRadius: 10 },
        [],
      ),
      div({ fontFamily: GRENZE, fontWeight: 500, fontSize: 44, color: GOLD_PALE }, "Urări de bine"),
      div(
        { width: 1040, height: 330, alignItems: "center", justifyContent: "center", textAlign: "center" },
        [
          {
            type: "div",
            props: {
              style: {
                display: "block",
                fontFamily: KURALE,
                fontSize: textSize(text.length),
                lineHeight: 1.25,
                color: PAPER,
                textAlign: "center",
                textWrap: "balance",
                maxWidth: 1040,
              },
              children: `„${text}”`,
            },
          },
        ],
      ),
      div({ height: 34, alignItems: "center", fontFamily: ALEGREYA, fontStyle: "italic", fontSize: 28, color: DIM }, source ? `Sursa: ${source}` : ""),
      div({ fontFamily: KURALE, fontSize: 24, color: GOLD, letterSpacing: 2 }, "uraridebine.ro"),
    ],
  );
}

async function renderer() {
  const { default: satori } = await import("satori");
  const { initWasm, Resvg } = await import("@resvg/resvg-wasm");
  const { default: jpeg } = await import("jpeg-js");
  await initWasm(readFileSync(require.resolve("@resvg/resvg-wasm/index_bg.wasm")));
  const fonts = loadFonts();
  return async (content) => {
    const svg = await satori(tree(content), { width: W, height: H, fonts });
    const px = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().pixels;
    return jpeg.encode({ data: Buffer.from(px), width: W, height: H }, 82).data;
  };
}

async function renderJobs(jobs) {
  const render = await renderer();
  for (const { id, file, content } of jobs) writeFileSync(join(outDir, file), await render(content));
}

if (!isMainThread) {
  await renderJobs(workerData);
  parentPort.postMessage("done");
} else {
  const t0 = Date.now();
  const entries = JSON.parse(readFileSync(join(root, "src", "generated", "data.json"), "utf8"));
  mkdirSync(outDir, { recursive: true });
  const wanted = new Set();
  const jobs = [];
  for (const e of entries) {
    const file = ogFile(e);
    if (!file) continue;
    wanted.add(file);
    if (!existsSync(join(outDir, file))) jobs.push({ id: e.id, file, content: ogContent(e) });
  }
  let removed = 0;
  for (const f of readdirSync(outDir)) {
    if (f.endsWith(".jpg") && !wanted.has(f)) {
      unlinkSync(join(outDir, f));
      removed++;
    }
  }
  const threads = Math.min(availableParallelism(), Math.ceil(jobs.length / 40));
  if (threads <= 1) {
    if (jobs.length) await renderJobs(jobs);
  } else {
    const chunks = Array.from({ length: threads }, (_, i) => jobs.filter((_, j) => j % threads === i));
    await Promise.all(
      chunks.map(
        (chunk) =>
          new Promise((resolve, reject) => {
            const w = new Worker(fileURLToPath(import.meta.url), { workerData: chunk });
            w.on("message", resolve);
            w.on("error", reject);
            w.on("exit", (c) => c && reject(new Error(`og worker exited with ${c}`)));
          }),
      ),
    );
  }
  console.log(`og: ${jobs.length} rendered, ${wanted.size - jobs.length} skipped, ${removed} removed (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}
