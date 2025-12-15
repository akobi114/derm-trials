import Link from 'next/link';
import { FlaskConical } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
          {/* Brand */}
          <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
            <div className="bg-slate-200 p-1.5 rounded-lg">
              <FlaskConical className="h-4 w-4 text-slate-500" />
            </div>
            <span className="font-bold text-slate-700">DermTrials</span>
          </div>

          {/* Links (Added Privacy Policy) */}
          <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-500 font-medium">
            <Link href="/" className="hover:text-indigo-600 transition-colors">Home</Link>
            <Link href="/conditions" className="hover:text-indigo-600 transition-colors">Browse Conditions</Link>
            <Link href="/terms" className="hover:text-indigo-600 transition-colors">Terms & Data</Link>
            <Link href="/privacy" className="hover:text-indigo-600 transition-colors">Privacy Policy</Link>
          </div>
        </div>

        {/* COMPLIANCE & ATTRIBUTION SECTION */}
        <div className="border-t border-slate-200 pt-8 text-center md:text-left">
          
          {/* Compliance Text - Low contrast to not distract, but readable for legal */}
          <div className="text-[11px] text-slate-400 leading-relaxed max-w-4xl space-y-2 mx-auto md:mx-0">
            <p>
              <strong>Data Source:</strong> Trial data sourced from the U.S. National Library of Medicine (NLM) at ClinicalTrials.gov. NLM, NIH, and ClinicalTrials.gov do not endorse or recommend this product.
            </p>
            <p>
              <strong>Medical Disclaimer:</strong> Content on this site is for informational and recruitment purposes only and is not medical advice. Participation in a clinical trial is a significant medical decision that should be discussed with your doctor.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
            <p className="text-xs text-slate-400 font-medium">
              © {new Date().getFullYear()} DermTrials Research.
            </p>
            {/* Secret Admin Link: Only visible on hover */}
            <Link href="/login" className="text-[10px] text-slate-200 hover:text-indigo-400 transition-colors">
              Admin
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}