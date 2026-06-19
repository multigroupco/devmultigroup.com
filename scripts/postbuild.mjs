// After `astro build`, the Cloudflare adapter writes the server bundle to
// dist/_worker.js and a Pages-style dist/_routes.json. When deploying as a
// Worker with Assets, wrangler must NOT upload those as public assets — so we
// emit a .assetsignore listing them.
import { writeFileSync } from "node:fs";

const target = new URL("../dist/.assetsignore", import.meta.url);
writeFileSync(target, "_worker.js\n_routes.json\n");
console.log("✓ wrote dist/.assetsignore (_worker.js, _routes.json)");
