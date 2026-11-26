import { cp } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");

// Next.js does not copy these into the standalone folder. Lolipop! Deploy Now
// publishes only `.next/standalone`, so the Node server must be able to serve
// them itself. Vercel keeps serving `public` and `.next/static` from its CDN.
await cp(path.join(root, "public"), path.join(standaloneDir, "public"), {
  recursive: true,
});
await cp(path.join(root, ".next", "static"), path.join(standaloneDir, ".next", "static"), {
  recursive: true,
});

console.log("Copied public and .next/static into .next/standalone");
