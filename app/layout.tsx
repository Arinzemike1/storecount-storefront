import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Order online",
  description: "Browse and order directly from your local shop.",
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
      </body>
    </html>
  );
}
