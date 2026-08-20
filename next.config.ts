import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /**
     * Every storefront route is dynamic (each reads the database), and since
     * Next 15 the client cache for dynamic routes defaults to 0 seconds — so
     * tapping Home → Orders → Home re-fetched the page from the server every
     * single time, even with prefetching.
     *
     * 30 seconds of reuse is safe here by design: the catalog's stock figure is
     * already documented as a stale hint that the merchant confirms against,
     * and order statuses are refreshed client-side on the Orders screen rather
     * than coming from this payload. Anything that must be live — placing an
     * order, order status — goes through /api, which this never touches.
     */
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
