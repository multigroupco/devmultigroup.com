// Astro session driver for the Node build (DMG_TARGET=node). On Cloudflare the
// adapter stores sessions in the SESSION KV namespace; here they are files under
// DATA_DIR/sessions. The folder is read at runtime (not baked in at build time),
// so the same image works with any DATA_DIR.
import path from "node:path";
import fsLite from "unstorage/drivers/fs-lite";

export default function sessionDriver(options = {}) {
  const data = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
  return fsLite({ base: path.join(data, "sessions"), ...options });
}
