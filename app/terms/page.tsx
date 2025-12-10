import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer'; // Import Footer if you want it here too
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Database, AlertTriangle } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 mb-8 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-8">Terms & Data Disclaimer</h1>

        <div className="space-y-8">
          
          {/* COMPLIANCE SECTION: DATA SOURCE */}
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-600" /> Data Source Attribution
            </h2>
            <div className="text-sm text-slate-600 leading-relaxed space-y-4">
              <p>
                DermTrials utilizes publicly available data provided by the <strong>U.S. National Library of Medicine (NLM)</strong>, part of the National Institutes of Health (NIH), through ClinicalTrials.gov.
              </p>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 italic text-slate-500">
                "NLM, NIH, and ClinicalTrials.gov do not endorse or recommend this product."
              </div>
              <p>
                The information provided on this website is synced periodically from the official registry. While we strive for accuracy, there may be delays between updates. Always refer to <a href="https://clinicaltrials.gov" target="_blank" className="text-indigo-600 underline">ClinicalTrials.gov</a> for the most current official records.
              </p>
            </div>
          </section>

          {/* COMPLIANCE SECTION: NOT MEDICAL ADVICE */}
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Medical Disclaimer
            </h2>
            <div className="text-sm text-slate-600 leading-relaxed space-y-4">
              <p>
                The content on DermTrials is for <strong>informational and recruitment purposes only</strong>. It is not intended to be a substitute for professional medical advice, diagnosis, or treatment.
              </p>
              <p>
                Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. Participation in a clinical trial is a significant medical decision that should be discussed with your doctor.
              </p>
            </div>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
}