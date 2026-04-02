import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

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
  keywords: [
    "hackathon timer",
    "hackathon control room",
    "stage timer",
    "countdown clock",
    "event flow software",
    "hackathon software",
    "participant room code",
  ],
  authors: [{ name: "GitHub Community SRMIST" }],
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
    images: ["/og-image.JPG"],
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
      </body>
    </html>
  );
}
