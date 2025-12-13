import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react"; 
import Footer from "@/components/Footer"; // <--- Import Footer

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
        {children}
        
        <Footer /> {/* <--- Restore this! */}
        
        <Analytics />
      </body>
    </html>
  );
}