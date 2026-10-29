// Stand-in for `workers-og` in the Node build (DMG_TARGET=node, aliased in
// astro.config.mjs). workers-og needs Workers-only pieces (.wasm module imports
// and HTMLRewriter), so on Node it cannot render. Throwing here sends
// /api/og down its existing fallback: a 302 to the static /og-default.png.
const unavailable = () => {
  throw new Error("OG image rendering is not available on the Node server");
};

export async function loadGoogleFont() {
  unavailable();
}

export class ImageResponse extends Response {
  constructor() {
    unavailable();
    super();
  }
}
