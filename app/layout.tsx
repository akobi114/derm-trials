import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react"; 
import Footer from "@/components/Footer"; 
import NavigationTracker from "@/components/NavigationTracker"; // <--- 1. NEW IMPORT

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DermTrials - Find Dermatology Clinical Trials",
  description: "Match with active dermatology studies near you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        
        {/* 2. TRACKER ADDED HERE (Invisible) */}
        <NavigationTracker />

        {children}
        
        <Footer />
        
        <Analytics />
      </body>
    </html>
  );
}