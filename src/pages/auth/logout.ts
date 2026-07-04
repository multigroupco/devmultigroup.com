import type { APIRoute } from "astro";

// Clear the local session. (Künye's own session/end-session is separate; this
// signs the user out of devmultigroup-web only.)
const handler: APIRoute = async ({ redirect, session }) => {
  try {
    await session?.destroy();
  } catch {
    await session?.delete("auth");
  }
  return redirect("/", 302);
};

export const GET = handler;
export const POST = handler;
export const prerender = false;
