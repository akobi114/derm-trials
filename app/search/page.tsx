"use client";

import Navbar from "@/components/Navbar";
import TrialGrid from "@/components/TrialGrid";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

// We wrap the content in Suspense so it handles the URL reading gracefully
function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || ""; // Reads "?q=acne" from URL

  return (
    <>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
      
      {/* We reuse the Grid, but now pass the URL query to it */}
      <TrialGrid searchQuery={query} />
    </>
  );
}

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Suspense fallback={<div className="p-10 text-center">Loading results...</div>}>
        <SearchContent />
      </Suspense>
    </main>
  );
}