// The tests read public/all.html from disk; the project does not pull in @types/node.
declare module "node:fs" {
  export function readFileSync(path: string | URL, encoding: "utf8"): string;
}
