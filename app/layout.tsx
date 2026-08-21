import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0f",
};

export const metadata: Metadata = {
  title: "UChat — Personal Character Chat",
  applicationName: "UChat",
  description:
    "Immersive AI roleplay platform with custom characters, contextual memory, and streaming responses.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UChat",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body>
        <div className="bg-mesh" />
        {children}
      </body>
    </html>
  );
}
