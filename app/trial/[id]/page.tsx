import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import type { Metadata, ResolvingMetadata } from 'next'; 
import { 
  CheckCircle2, Wallet, 
  HeartHandshake, Star, MapPin, Building2, 
  UserCheck, MessageCircle, Image as ImageIcon,
  ShieldCheck, Lock, Stethoscope, Crown
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import TrialClientLogic from '@/components/TrialClientLogic'; 
import BackButton from '@/components/BackButton'; // We will create this small component next

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// --- 1. DYNAMIC SEO GENERATOR ---
export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  
  // Fetch Base
  const { data: trial } = await supabase.from('trials').select('*').eq('nct_id', id).single();
  if (!trial) return { title: 'Trial Not Found' };

  // Fetch Override
  const { data: claim } = await supabase.from('claimed_trials').select('custom_brief_summary').eq('nct_id', id).single();

  const summaryToUse = claim?.custom_brief_summary || trial.simple_summary || trial.brief_summary || "";
  const cityList = trial.locations ? trial.locations.slice(0, 2).map((l: any) => l.city).join(', ') : 'Phoenix';

  return {
    title: `${trial.condition || 'Clinical'} Trial in ${cityList} | DermTrials`,
    description: summaryToUse.substring(0, 150) + "...",
  };
}

// --- HELPER: VIDEO PLAYER ---
function VideoPlayer({ url }: { url: string }) {
  if (!url) return null;
  let embedUrl = url;
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
    embedUrl = `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0`;
  } else if (url.includes('vimeo.com')) {
    const videoId = url.split('/').pop();
    embedUrl = `https://player.vimeo.com/video/${videoId}`;
  } else if (url.includes('loom.com')) {
    embedUrl = url.replace('/share/', '/embed/');
  }

  return (
    <div className="mb-8 rounded-2xl overflow-hidden shadow-lg aspect-video bg-black">
      <iframe src={embedUrl} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media"></iframe>
    </div>
  );
}

// --- 2. SERVER COMPONENT ---
export default async function TrialDetail({ params, searchParams }: Props) {
  const { id } = await params;
  
  // We grab the "ref_zip" from the URL if it exists (e.g. /trial/123?ref_zip=85001)
  // This helps us sort locations by distance!
  const sp = await searchParams;
  const userZip = typeof sp.ref_zip === 'string' ? sp.ref_zip : undefined;

  // A. Fetch Base Data
  const { data: trial, error } = await supabase.from('trials').select('*').eq('nct_id', id).single();
  if (error || !trial) notFound();

  // B. Fetch Researcher Customizations + TIER STATUS
  const { data: claim } = await supabase
    .from('claimed_trials')
    .select(`
      custom_brief_summary, 
      custom_screener_questions, 
      video_url, 
      custom_faq, 
      facility_photos,
      researcher_profiles (
        tier
      )
    `)
    .eq('nct_id', id)
    .single();

  // C. MERGE LOGIC & TIER CHECK
  let isCustomSummary = false;
  // Safely access tier (Typescript workaround for nested Supabase join)
  const tier = (claim as any)?.researcher_profiles?.tier || 'free';
  const isPro = tier === 'pro';

  if (claim) {
    if (claim.custom_brief_summary) {
        trial.simple_summary = claim.custom_brief_summary;
        isCustomSummary = true;
    }
    if (claim.custom_screener_questions && claim.custom_screener_questions.length > 0) {
        trial.screener_questions = claim.custom_screener_questions;
    }
  }

  const statusStyle = trial.status?.toLowerCase() === 'recruiting' 
    ? { badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500", glow: true }
    : { badge: "bg-slate-50 text-slate-600 ring-slate-500/10", dot: "bg-slate-400", glow: false };

  // D. DYNAMIC BACKGROUND
  const bgClass = isPro 
    ? "bg-gradient-to-br from-indigo-50/40 via-white to-amber-50/20" 
    : "bg-slate-50";

  const cardClass = isPro
    ? "bg-white rounded-2xl shadow-md border border-indigo-100 ring-1 ring-indigo-50/50 p-8 mb-8 relative overflow-hidden"
    : "bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8";

  return (
    <div className={`min-h-screen font-sans pb-20 ${bgClass}`}>
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-10">
        
        {/* CLIENT COMPONENT FOR SMART BACK NAVIGATION */}
        <BackButton />

        {/* HEADER */}
        <div className={cardClass}>
          {isPro && (
             <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Crown className="w-32 h-32 text-amber-400 -mr-8 -mt-8 rotate-12" />
             </div>
          )}

          <div className="flex flex-wrap items-center gap-3 mb-5 relative z-10">
            {isPro && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 border border-amber-100 shadow-sm">
                    <Crown className="h-3 w-3" /> Featured Study
                </span>
            )}
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

          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 leading-tight relative z-10">
            {trial.simple_title || trial.title}
          </h1>
          <div className="flex flex-col md:flex-row md:items-center gap-4 text-sm text-slate-500 pt-4 border-t border-slate-100 mt-6 relative z-10">
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
          
          {/* --- LEFT COLUMN --- */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* 1. VIDEO */}
            {claim?.video_url && <VideoPlayer url={claim.video_url} />}

            {/* 2. OVERVIEW */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 relative"> 
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${isCustomSummary ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  {isCustomSummary ? <UserCheck className="h-6 w-6" /> : <Star className="h-6 w-6" />}
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  {isCustomSummary ? "Study Overview" : "AI Powered Overview"}
                </h2>
              </div>
              <div className="text-slate-700 text-sm leading-7">
                {trial.simple_summary ? (
                  <ReactMarkdown components={{ strong: ({node, ...props}) => <span className="font-extrabold text-slate-900" {...props} />, p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />, ul: ({node, ...props}) => <ul className="space-y-2 mb-4" {...props} />, li: ({node, ...props}) => <li className="leading-relaxed" {...props} /> }}>
                    {trial.simple_summary}
                  </ReactMarkdown>
                ) : <p className="text-slate-500 italic">Processing summary...</p>}
              </div>
            </section>

            {/* 3. SAFETY & TRUST */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3"><ShieldCheck className="h-5 w-5" /></div>
                    <h4 className="font-bold text-slate-900 text-sm">IRB Approved</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Ethical oversight & safety review.</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-3"><Lock className="h-5 w-5" /></div>
                    <h4 className="font-bold text-slate-900 text-sm">HIPAA Compliant</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Your data is secure & private.</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-3"><Stethoscope className="h-5 w-5" /></div>
                    <h4 className="font-bold text-slate-900 text-sm">Expert Care</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Monitored by medical specialists.</p>
                </div>
            </section>

            {/* 4. FACILITY PHOTOS */}
            {claim?.facility_photos && claim.facility_photos.length > 0 && (
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><ImageIcon className="h-5 w-5 text-indigo-600" /> Facility & Staff</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {claim.facility_photos.map((url: string, i: number) => (
                            <div key={i} className="aspect-square rounded-xl overflow-hidden bg-slate-100">
                                <img src={url} alt="Facility" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* 5. FAQ */}
            {claim?.custom_faq && claim.custom_faq.length > 0 && (
                <section className="bg-indigo-50 rounded-2xl border border-indigo-100 p-8">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><MessageCircle className="h-5 w-5 text-indigo-600" /> Frequently Asked Questions</h3>
                    <div className="space-y-4">
                        {claim.custom_faq.map((item: any, i: number) => (
                            <div key={i} className="bg-white p-5 rounded-xl border border-indigo-100 shadow-sm flex items-start gap-4">
                                <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 text-xs font-bold mt-0.5">
                                    {i + 1}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm mb-2">{item.question}</h4>
                                    <p className="text-sm text-slate-600 leading-relaxed">{item.answer}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* 6. BENEFITS */}
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

            {/* 7. DETAILS & INTERACTIVITY - We now pass the userZip! */}
            <TrialClientLogic trial={trial} userZip={userZip} />

          </div>

          {/* --- RIGHT SIDEBAR --- */}
          <div className="space-y-6">
            
            <TrialClientLogic trial={trial} sidebarMode={true} userZip={userZip} />

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