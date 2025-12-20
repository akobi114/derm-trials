"use client";

import Navbar from "@/components/Navbar";
import TrialResultsList from "@/components/TrialResultsList"; 
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SearchResults() {
  const searchParams = useSearchParams();
  
  // 1. Grab all the search parameters from the URL
  const query = searchParams.get("q") || "";
  const zip = searchParams.get("zip") || "";
  const distance = searchParams.get("distance") || "50"; // Default to 50 miles

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="pt-8">
        {/* 2. Pass them all to the list component */}
        <TrialResultsList 
          searchQuery={query} 
          zipCode={zip} 
          distance={parseInt(distance)} 
        />
      </div>
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