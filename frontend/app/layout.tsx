import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARCAEGIS — AI Risk Oracle & Vault",
  description: "AI-powered risk oracle and safeguard vault for real-world-asset collateral on X Layer.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <div className="grain" />
        {children}
      </body>
    </html>
  );
}
