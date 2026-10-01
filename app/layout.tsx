import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Second Spin — Your listening room",
  description: "Rediscover the records that made you. Find your next old favorite.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
