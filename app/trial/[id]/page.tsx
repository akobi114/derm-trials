import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import type { Metadata, ResolvingMetadata } from 'next'; // Import Types
import { 
  ArrowRight, CheckCircle2, FlaskConical, Wallet, 
  HeartHandshake, Star, Info, MapPin, Building2, 
  ArrowLeft, BookOpen, FileText, ShieldCheck, ChevronDown, 
  Lock, ClipboardCheck 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import TrialClientLogic from '@/components/TrialClientLogic'; // We will move the client logic here

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>
}

// --- 1. DYNAMIC SEO GENERATOR ---
export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  
  // Fetch trial for SEO
  const { data: trial } = await supabase.from('trials').select('*').eq('nct_id', id).single();

  if (!trial) {
    return { title: 'Trial Not Found' };
  }

  const title = `${trial.condition || 'Dermatology'} Clinical Trial in ${trial.locations?.[0]?.city || 'Phoenix'} | DermTrials`;
  const desc = `Join a paid research study for ${trial.condition}. ${trial.title}. Check your eligibility now.`;

  return {
    title: title,
    description: desc,
    openGraph: {
      title: title,
      description: desc,
      // You can eventually add a dynamic image here
      images: ['/og-default.png'], 
    },
  };
}

// --- 2. SERVER COMPONENT ---
export default async function TrialDetail({ params }: Props) {
  const { id } = await params;

  const { data: trial, error } = await supabase
    .from('trials')
    .select('*')
    .eq('nct_id', id)
    .single();

  if (error || !trial) {
    notFound();
  }

  // Helper for status styling
  const getStatusStyle = (status: string) => {
    const s = (status || "").toLowerCase().trim();
    if (s === 'recruiting') return { badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500", glow: true };
    return { badge: "bg-slate-50 text-slate-600 ring-slate-500/10", dot: "bg-slate-400", glow: false };
  };
  const statusStyle = getStatusStyle(trial.status);
  const isRecruiting = trial.status && trial.status.toLowerCase().trim() === 'recruiting';

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <Navbar />

      {/* --- STRUCTURED DATA (SCHEMA.ORG) FOR GOOGLE --- */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MedicalStudy",
            "name": trial.title,
            "status": trial.status,
            "healthCondition": trial.condition,
            "sponsor": { "@type": "Organization", "name": trial.sponsor },
            "location": {
                "@type": "Place",
                "name": "DermTrials Site",
                "address": {
                    "@type": "PostalAddress",
                    "addressLocality": trial.locations?.[0]?.city || "Phoenix",
                    "addressRegion": trial.locations?.[0]?.state || "AZ"
                }
            }
          })
        }}
      />

      <main className="max-w-5xl mx-auto px-6 py-10">
        
        {/* BACK LINK */}
        <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 mb-8 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
        </Link>

        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
          <div className="flex flex-wrap gap-3 mb-5">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ring-1 ring-inset ${statusStyle.badge}`}>
              <span className={`relative flex h-2 w-2`}>
                {statusStyle.glow && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusStyle.dot}`}></span>}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${statusStyle.dot}`}></span>
              </span>
              {trial.status}
            </span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wide rounded-full">
              {trial.phase}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 leading-tight">
            {trial.simple_title || trial.title}
          </h1>
          <div className="flex flex-col md:flex-row md:items-center gap-4 text-sm text-slate-500 pt-4 border-t border-slate-100 mt-6">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <span className="font-medium text-slate-900">{trial.sponsor}</span>
            </div>
            <div className="hidden md:block w-1 h-1 bg-slate-300 rounded-full" />
            <div className="flex items-center gap-2">
              <span className="font-medium">NCT ID:</span> {trial.nct_id}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- LEFT COLUMN: CONTENT --- */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* AI OVERVIEW */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 relative"> 
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Star className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">AI Powered Overview</h2>
              </div>
              <div className="text-slate-700 text-sm leading-7">
                {trial.simple_summary ? (
                  <ReactMarkdown components={{ strong: ({node, ...props}) => <span className="font-extrabold text-slate-900" {...props} />, p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />, ul: ({node, ...props}) => <ul className="space-y-2 mb-4" {...props} />, li: ({node, ...props}) => <li className="leading-relaxed" {...props} /> }}>
                    {trial.simple_summary}
                  </ReactMarkdown>
                ) : <p className="text-slate-500 italic">Processing summary...</p>}
              </div>
            </section>

            {/* BENEFITS (IRB SAFE) */}
            <section className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-2xl border border-indigo-100 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <HeartHandshake className="h-5 w-5 text-indigo-600" /> Why Consider This Study?
              </h2>
              <div className="text-sm text-slate-700 leading-relaxed space-y-4">
                {trial.ai_benefits ? (
                  <p className="whitespace-pre-wrap">{trial.ai_benefits}</p>
                ) : (
                  <>
                    <p>Participants in clinical trials gain access to investigational treatments before they are widely available. You will receive close medical monitoring by board-certified specialists.</p>
                    <p>Additionally, your participation contributes to the advancement of medical science, potentially helping others with this condition.</p>
                  </>
                )}
              </div>
            </section>

            {/* DETAILS (Collapsible Logic - Handled by Client Component below) */}
            <TrialClientLogic trial={trial} />

          </div>

          {/* --- RIGHT SIDEBAR: ACTION CENTER --- */}
          <div className="space-y-6">
            
            {/* CLIENT-SIDE INTERACTIVITY (Quiz & Buttons) */}
            <TrialClientLogic trial={trial} sidebarMode={true} />

            {/* STIPEND INFO */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-600" /> Stipend & Costs
              </h4>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /></div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">No Cost to Participate</p>
                    <p className="text-xs text-slate-500 leading-snug">Medication and care provided at no cost. No insurance needed.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /></div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Compensation Available</p>
                    <p className="text-xs text-slate-500 leading-snug">Reimbursement for time and travel for completed visits.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* LOCATION */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><MapPin className="h-4 w-4 text-indigo-600" /> Locations</h4>
              <div className="max-h-60 overflow-y-auto space-y-3">
                {trial.locations && trial.locations.length > 0 ? (
                  trial.locations.map((loc: any, idx: number) => (
                    <div key={idx} className="text-sm pb-2 border-b border-slate-50 last:border-0"><p className="font-medium text-slate-900">{loc.city}, {loc.state}</p></div>
                  ))
                ) : <p className="text-sm text-slate-500">See ClinicalTrials.gov</p>}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}