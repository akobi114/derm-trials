import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react"; 
import Footer from "@/components/Footer"; 
import NavigationTracker from "@/components/NavigationTracker";
import { Suspense } from "react"; // 1. Added Suspense import

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
        {/* 2. Wrapped everything in Suspense.
          This prevents 'useSearchParams' bailout errors from breaking the build 
          when any child component (like NavigationTracker or Navbar) uses client hooks.
        */}
        <Suspense fallback={null}>
          <NavigationTracker />

          {children}
          
          <Footer />
        </Suspense>
        
        <Analytics />
      </body>
    </html>
  );
}