"use client";

import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6 font-sans">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200">
        
        <Link href="/" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-indigo-600 mb-8 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
        </Link>

        <header className="mb-10 border-b border-slate-100 pb-6">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Privacy Policy</h1>
          <p className="text-slate-500 mt-2">Last Updated: December 2025</p>
        </header>

        <div className="prose prose-slate max-w-none text-slate-700 space-y-8 leading-relaxed">
          <section>
            <p>
              DermTrials ("we", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and share your information when you use our platform as either a patient or a <strong>Principal Investigator</strong>.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold text-slate-900 mb-3">1. Information We Collect</h3>
            <p>We collect information you provide directly to us, including:</p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li><strong>Identity & Contact Data:</strong> Name, email, phone number, and zip code.</li>
              {/* Added PI specific data collection */}
              <li><strong>Professional Credentials (PIs Only):</strong> National Provider Identifier (NPI) number, institutional affiliation, professional title, and verification documents (e.g., ID badges, business cards, or official letterhead).</li>
              <li><strong>Health Screening Data (Patients Only):</strong> Answers to eligibility questionnaires regarding specific medical conditions and medications.</li>
              <li><strong>Technical Data:</strong> IP address, browser type, and device information.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold text-slate-900 mb-3">2. How We Use Your Information</h3>
            <p>We use your data to:</p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              {/* Added PI specific usage */}
              <li><strong>Verify Investigator Standing:</strong> We use professional credentials and NPI data to manually verify the identity and professional status of researchers before granting dashboard access.</li>
              <li>Determine patient eligibility for clinical trials and connect them with verified researchers.</li>
              <li>Communicate application or account verification status via email, text, or phone.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold text-slate-900 mb-3">3. Sharing Your Information</h3>
            <p className="mb-2"><strong>Investigator Data:</strong> Professional information provided by investigators (Name, NPI, Site Name) may be displayed on public-facing trial pages to facilitate patient recruitment.</p>
            <p className="mb-2"><strong>Patient Data:</strong> When a patient applies for a trial, their profile is shared exclusively with the <strong>Verified Principal Investigator</strong> and their authorized site staff.</p>
            <p className="mt-4 font-bold text-slate-900">We do not sell professional credentials or personal health data to third-party data brokers for non-research purposes.</p>
          </section>

          <section>
            <h3 className="text-xl font-bold text-slate-900 mb-3">4. Access & Deletion</h3>
            <p>You may request a copy of your data or request deletion of your account (including uploaded professional verification documents) by contacting us at support@dermtrials.com.</p>
          </section>
        </div>
      </div>
    </div>
  );
}