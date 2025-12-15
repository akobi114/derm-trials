import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6 font-sans">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200">
        
        <Link href="/" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-indigo-600 mb-8 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
        </Link>

        <header className="mb-10 border-b border-slate-100 pb-6">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Terms of Service</h1>
          <p className="text-slate-500 mt-2">Last Updated: December 2025</p>
        </header>

        <div className="prose prose-slate max-w-none text-slate-700 space-y-8 leading-relaxed">
          <section>
            <h3 className="text-xl font-bold text-slate-900 mb-3">1. Nature of Our Services</h3>
            <p>
              DermTrials ("Company", "we", "us") is a digital marketing and patient recruitment platform. 
              <strong className="text-slate-900 block mt-2">We are not a healthcare provider, medical office, or research site.</strong>
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li><strong>No Medical Advice:</strong> The content, screening questionnaires, and communications provided by DermTrials are for informational and recruitment purposes only. Nothing on this platform constitutes medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.</li>
              <li><strong>Role of DermTrials:</strong> We connect interested candidates with third-party clinical researchers. We do not conduct the trials, control the medical protocols, or guarantee acceptance into any study.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold text-slate-900 mb-3">2. TCPA Consent & Communications</h3>
            <p>
              By providing your phone number and clicking "Submit" or "Check Eligibility," you provide your <strong>express written consent</strong> to receive calls, SMS/MMS text messages, and emails from DermTrials and our partner research sites.
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li><strong>Automated Technology:</strong> You acknowledge that these communications may be sent using an automatic telephone dialing system (autodialer) or prerecorded voice.</li>
              <li><strong>Content:</strong> Messages may include updates on your application status, appointment reminders, and alerts about future clinical trial opportunities.</li>
              <li><strong>Opt-Out:</strong> Consent is not a condition of purchase. You may opt-out of text messages at any time by replying "STOP." Message and data rates may apply.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold text-slate-900 mb-3">3. Eligibility & Account Security</h3>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li>You must be at least 18 years old to use this platform.</li>
              <li>You agree to provide accurate, current, and complete information during the screening process. Providing false health information to qualify for a study is a violation of these Terms.</li>
              <li>You are responsible for maintaining the confidentiality of your dashboard password.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold text-slate-900 mb-3">4. User Data & Privacy</h3>
            <p>
              Our use of your personal information is governed by our <Link href="/privacy" className="text-indigo-600 font-bold hover:underline">Privacy Policy</Link>. By using DermTrials, you consent to the collection and sharing of your information with clinical research sites as described in that policy.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold text-slate-900 mb-3">5. Limitation of Liability</h3>
            <p>To the fullest extent permitted by law, DermTrials shall not be liable for:</p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li>Any injury, health complication, or damages arising from your participation in a clinical trial found through our service.</li>
              <li>The conduct, negligence, or medical decisions of any third-party researcher or clinical site.</li>
              <li>Any technical errors or data loss on the platform.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold text-slate-900 mb-3">6. Data Sources & Attribution</h3>
            <p>
              This application uses publicly available data from the U.S. National Library of Medicine (NLM) at <a href="https://clinicaltrials.gov" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">ClinicalTrials.gov</a>.
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li><strong>Source Attribution:</strong> Study titles, descriptions, and eligibility criteria are sourced via the ClinicalTrials.gov API.</li>
              <li><strong>No Endorsement:</strong> DermTrials is not affiliated with, endorsed by, or sponsored by the NLM, the National Institutes of Health (NIH), or the U.S. Department of Health and Human Services (HHS).</li>
              <li><strong>Data Accuracy:</strong> While we strive to keep information updated, clinical trial details change frequently. We do not guarantee that the study information displayed is current or error-free. Always verify details with the specific clinical site.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold text-slate-900 mb-3">7. Contact Us</h3>
            <p>For questions about these Terms, please contact us at support@dermtrials.com.</p>
          </section>
        </div>
      </div>
    </div>
  );
}