import type { NextRequest } from "next/server";
import { getStoreBySlug } from "@/lib/queries";

/**
 * Per-store web app manifest.
 *
 * Next's `app/manifest.ts` convention only works at the app root, which would
 * force a single `start_url` of "/" — and "/" is the bare landing page, not a
 * shop. Installing from a store page has to open *that* store, so the manifest
 * is served per slug instead.
 *
 * `id` and `scope` are slug-scoped too: two shops installed on the same device
 * stay separate apps, and tapping through to a different shop leaves the
 * standalone window rather than silently rebranding it.
 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/[slug]/manifest.webmanifest">,
) {
  const { slug } = await ctx.params;
  const store = await getStoreBySlug(slug);

  if (!store) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const manifest = {
    name: "3Brothers",
    short_name: "3Brothers",
    description:
      store.description ?? `Order from ${store.name} and track your delivery.`,
    id: `/${slug}`,
    start_url: `/${slug}`,
    scope: `/${slug}`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f7f4",
    theme_color: "#1c4b36",
    categories: ["shopping", "food"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "My orders",
        url: `/${slug}/orders`,
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };

  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      // Store settings (name, description) can change; don't pin this for long.
      "Cache-Control": "public, max-age=0, s-maxage=300",
    },
  });
}
