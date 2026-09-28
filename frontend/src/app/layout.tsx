import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SkillVeda | From Learning to Leading",
  description: "AI-Powered Skill Intelligence for Bharat",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} bg-background text-text-main antialiased min-h-screen font-sans`}>
        {children}
      </body>
    </html>
  );
}
