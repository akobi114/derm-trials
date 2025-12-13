export default function TrialCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-full animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="h-6 w-24 bg-slate-200 rounded-full"></div>
        <div className="h-6 w-20 bg-slate-200 rounded-md"></div>
      </div>

      {/* Title */}
      <div className="space-y-2 mb-4 flex-grow">
        <div className="h-6 w-3/4 bg-slate-200 rounded"></div>
        <div className="h-6 w-1/2 bg-slate-200 rounded"></div>
      </div>

      {/* Location */}
      <div className="h-4 w-1/3 bg-slate-200 rounded mb-6"></div>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-slate-50">
        <div className="h-10 w-full bg-slate-100 rounded-lg"></div>
      </div>
    </div>
  );
}