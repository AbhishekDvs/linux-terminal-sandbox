import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Linux Terminal Sandbox',
  description: 'Try out linux commands in your web browser!',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'Linux Terminal Sandbox',
    description: 'Try out linux commands in your web browser!',
    url: 'https://terminalsandbox.pages.dev',
    siteName: 'Linux Terminal Sandbox',
    images: [
      {
        url: 'https://terminalsandbox.pages.dev/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Linux Terminal Preview',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Linux Terminal Sandbox',
    description: 'Try out linux commands in your web browser!',
    images: ['https://terminalsandbox.pages.dev/og-image.png'],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
