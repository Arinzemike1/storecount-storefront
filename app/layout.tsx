import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "3Brothers",
    // Store pages set their own title; this keeps the brand alongside it.
    template: "%s · 3Brothers",
  },
  description: "Browse and order directly from your local shop.",
  applicationName: "3Brothers",
  appleWebApp: {
    capable: true,
    title: "3Brothers",
    statusBarStyle: "default",
  },
  // iOS ignores the manifest's icons and `purpose`, so it gets its own opaque one.
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1c4b36",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh flex flex-col bg-bg text-ink antialiased">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
