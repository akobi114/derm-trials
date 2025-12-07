"use client";

import Navbar from "@/components/Navbar";
import TrialGrid from "@/components/TrialGrid";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// This component reads the URL (e.g. ?q=eczema) and passes it to your Grid
function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || ""; // Grabs "eczema" from the URL

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* Simple Header instead of the Big Purple Hero */}
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-6 py-12">
          
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Search Results
          </h1>
          <p className="mt-2 text-slate-600">
            Showing clinical trials matching <span className="font-bold text-indigo-600">"{query}"</span>
          </p>
        </div>
      </div>

      {/* REUSE YOUR EXISTING LOGIC: This grid will see the query and filter the results automatically */}
      <TrialGrid searchQuery={query} />
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center text-slate-500">Loading results...</div>}>
      <SearchResults />
    </Suspense>
  );
}