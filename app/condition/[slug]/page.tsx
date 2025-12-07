import Navbar from "@/components/Navbar";
import TrialGrid from "@/components/TrialGrid";
import { ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

// This is our "Knowledge Base" for SEO text
const CONDITION_CONTENT: Record<string, { title: string; description: string }> = {
  psoriasis: {
    title: "Psoriasis Clinical Trials",
    description: "Access the latest biologic and topical treatments for plaque psoriasis. Paid studies available in Phoenix and Scottsdale.",
  },
  eczema: {
    title: "Eczema (Atopic Dermatitis) Studies",
    description: "Find breakthrough treatments for moderate-to-severe eczema. Compensation up to $1,200 for qualified participants.",
  },
  acne: {
    title: "Acne & Scarring Research",
    description: "Join studies testing next-generation laser therapies and oral medications for persistent acne and scarring.",
  },
  alopecia: {
    title: "Alopecia Areata Trials",
    description: "New JAK inhibitor studies are recruiting now for hair loss conditions. Check eligibility today.",
  },
};

export function generateStaticParams() {
  return Object.keys(CONDITION_CONTENT).map((slug) => ({ slug }));
}

export default function ConditionPage({ params }: { params: { slug: string } }) {
  const content = CONDITION_CONTENT[params.slug];

  // If someone types /condition/pizza, show 404
  if (!content) {
    return notFound();
  }

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      
      {/* SEO Header */}
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600">
              <ArrowLeft className="h-4 w-4" />
              Back to All Conditions
            </Link>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl mb-4">
            {content.title}
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl leading-relaxed">
            {content.description}
          </p>
          
          <div className="mt-8 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              FDA Regulated
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              No Insurance Needed
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Compensation Provided
            </div>
          </div>
        </div>
      </div>

      {/* The Grid - Pre-filtered for this condition */}
      <TrialGrid searchQuery={params.slug === "eczema" ? "eczema" : params.slug === "acne" ? "acne" : params.slug === "alopecia" ? "alopecia" : "psoriasis"} />
    </main>
  );
}