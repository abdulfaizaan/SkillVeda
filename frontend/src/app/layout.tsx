import type { Metadata } from "next";
import "./globals.css";


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
      <body className="bg-background text-text-main antialiased min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
