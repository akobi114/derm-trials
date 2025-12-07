import { MOCK_TRIALS } from "@/lib/mockData";
import TrialCard from "./TrialCard";

interface TrialGridProps {
  searchQuery: string;
}

export default function TrialGrid({ searchQuery }: TrialGridProps) {
  
  // LOGIC: Filter the trials based on the search query
  const filteredTrials = MOCK_TRIALS.filter((trial) => {
    const query = searchQuery.toLowerCase();
    return (
      trial.condition.toLowerCase().includes(query) ||
      trial.title.toLowerCase().includes(query) ||
      trial.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  return (
    <section className="py-24 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6">
        
        {/* Header */}
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Featured Opportunities
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Showing {filteredTrials.length} result{filteredTrials.length !== 1 && 's'} for <span className="font-semibold text-indigo-600">"{searchQuery || 'All Conditions'}"</span>
            </p>
          </div>
        </div>

        {/* The Grid: Maps through the FILTERED list, not the full list */}
        {filteredTrials.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTrials.map((trial) => (
              <TrialCard key={trial.id} trial={trial} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <p className="text-slate-500">No trials found for "{searchQuery}". Try searching "Acne" or "Eczema".</p>
          </div>
        )}

      </div>
    </section>
  );
}