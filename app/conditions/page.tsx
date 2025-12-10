import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ArrowRight, Search } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = 'force-dynamic';

export default async function ConditionsDirectory() {
  // Fetch distinct conditions
  const { data: trials } = await supabase.from('trials').select('condition');
  
  // De-duplicate and sort
  const conditions = Array.from(new Set(trials?.map(t => t.condition))).filter(Boolean).sort();

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <Navbar />
      <div className="flex-grow max-w-4xl mx-auto px-6 py-16 w-full">
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Browse by Condition</h1>
          <p className="text-slate-500">Select a dermatological condition to view currently recruiting studies.</p>
        </div>
        
        {conditions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {conditions.map((cond: any) => (
              <Link 
                key={cond} 
                href={`/condition/${encodeURIComponent(cond)}`}
                className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all group"
              >
                <span className="font-bold text-slate-700 group-hover:text-indigo-700">{cond}</span>
                <div className="bg-slate-50 p-2 rounded-full group-hover:bg-indigo-50">
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
            <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-400">
              <Search className="h-6 w-6" />
            </div>
            <p className="text-slate-500">No active studies found in the system right now.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}