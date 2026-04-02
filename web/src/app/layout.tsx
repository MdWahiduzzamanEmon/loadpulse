import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "LoadPulse — Visual API Load Testing Dashboard",
    template: "%s | LoadPulse",
  },
  description:
    "Test any REST API with 7 test types: load, stress, spike, soak, functional, cache, and auth. Real-time animated results, per-endpoint stats, and detailed error breakdowns.",
  keywords: [
    "API testing",
    "load testing",
    "stress testing",
    "API monitoring",
    "performance testing",
    "REST API",
    "WebSocket",
    "developer tools",
    "LoadPulse",
  ],
  authors: [{ name: "LoadPulse" }],
  creator: "LoadPulse",
  openGraph: {
    type: "website",
    title: "LoadPulse — Visual API Load Testing Dashboard",
    description:
      "Test any REST API with real-time animated results. 7 test types, live charts, per-endpoint breakdowns.",
    siteName: "LoadPulse",
  },
  twitter: {
    card: "summary_large_image",
    title: "LoadPulse — Visual API Load Testing Dashboard",
    description:
      "Test any REST API with real-time animated results. 7 test types, live charts, per-endpoint breakdowns.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex bg-background text-foreground">
        <Providers>
          <Sidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
