"use client";

export default function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 mt-auto">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Brand & Copyright */}
          <div>
            <span className="text-lg font-bold text-slate-900">
              Derm<span className="text-indigo-600">Trials</span>
            </span>
            <p className="mt-4 text-sm text-slate-500 max-w-xs">
              Connecting patients with breakthrough dermatology research. 
              Find your match today.
            </p>
            <p className="mt-4 text-xs text-slate-400">
              &copy; {new Date().getFullYear()} DermTrials. All rights reserved.
            </p>
          </div>

          {/* REQUIRED GOVERNMENT DISCLAIMER */}
          <div className="text-xs text-slate-500 space-y-3">
            <p className="font-semibold text-slate-700">Data Source & Disclaimer</p>
            <p>
              This product uses the <strong>ClinicalTrials.gov API</strong> but is not endorsed or certified by the U.S. National Library of Medicine (NLM), the National Institutes of Health (NIH), or the U.S. Department of Health and Human Services (HHS).
            </p>
            <p>
              Listing a study on this site does not mean it has been evaluated by the U.S. Federal Government. The safety and scientific validity of this study is the responsibility of the study sponsor and investigators.
            </p>
            <p>
              Always consult with a healthcare professional before participating in any clinical trial.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}