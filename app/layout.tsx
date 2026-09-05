import type { Metadata } from "next";
import "./globals.css";
import { PwaRegister } from "./pwa-register";

export const metadata: Metadata = {
  title: "Livestock Record Manager",
  description: "Private cow, buffalo, goat and camel records, weights, health history and farm expenses.",
  applicationName: "Livestock Records",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Livestock Records" },
  icons: {
    icon: "/app-icon.svg",
    shortcut: "/app-icon.svg",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
