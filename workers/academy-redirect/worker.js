// academy.devmultigroup.com now lives at devmultigroup.com/academy. This tiny
// Worker answers every request on the old host with a permanent redirect, so
// the Next.js app (academy-web) no longer runs and burns CPU.
export default {
  fetch() {
    return Response.redirect("https://devmultigroup.com/academy", 301);
  },
};
