import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { Analytics } from "@vercel/analytics/next";

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hacktime.githubsrmist.in"),
  title: {
    default: "Hackathon Control Room, Countdown Timer & Stage View",
    template: "%s | hackTime",
  },
  description:
    "Run hackathons with a synchronized control room, live countdowns, multi-phase event flows, stage screens, and six-character room codes.",
  applicationName: "hackTime",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  keywords: [
    "hackathon timer",
    "hackathon control room",
    "stage timer",
    "countdown clock",
    "event flow software",
    "hackathon software",
    "participant room code",
  ],
  authors: [{ name: "GitHub Community SRM", url: "https://githubsrmist.in" }],
  creator: "GitHub Community SRM",
  publisher: "GitHub Community SRM",
  category: "productivity",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Hackathon Control Room, Countdown Timer & Stage View",
    description:
      "Coordinate organizers, AV teams, and participants with live countdowns, timed announcements, and shared room codes.",
    url: "/",
    siteName: "hackTime",
    images: [
      {
        url: "/og-image.JPG",
        width: 1200,
        height: 630,
        alt: "hackTime Open Graph social frame",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hackathon Control Room, Countdown Timer & Stage View",
    description:
      "Coordinate hackathons with live countdowns, broadcast announcements, and shared room codes.",
    images: ["/og-image.JPG"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${ibmPlexMono.variable} antialiased`}
        style={{ color: '#E6E6E6' }}
        suppressHydrationWarning
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
