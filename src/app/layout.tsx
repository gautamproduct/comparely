import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Comparely — Compare grocery prices instantly",
  description:
    "Compare real-time prices and delivery times for groceries across Blinkit, Zepto, and Instamart. Save up to 30% on every order.",
  openGraph: {
    title: "Comparely",
    description: "Compare grocery prices across Blinkit, Zepto, and Instamart.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
