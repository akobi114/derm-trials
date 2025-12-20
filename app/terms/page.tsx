"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Mail, X, Send, Loader2, MessageSquare, Scale, FileWarning, Gavel, Ban } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function TermsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'general_inquiry',
    subject: 'Terms of Service Inquiry',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        researcher_name: formData.name,
        researcher_email: formData.email,
        category: formData.category,
        subject: formData.subject,
        message: formData.message,
        status: 'open'
      });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess(false);
        setFormData({ name: '', email: '', category: 'general_inquiry', subject: 'Terms of Service Inquiry', message: '' });
      }, 2000);
    } catch (err: any) {
      alert("Failed to send message: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 py-12 px-6 font-sans">
        <div className="max-w-4xl mx-auto bg-white p-8 md:p-16 rounded-3xl shadow-sm border border-slate-200">
          
          <Link href="/" className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-indigo-600 mb-8 transition-colors uppercase tracking-wide">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Link>

          <header className="mb-12 border-b border-slate-100 pb-8">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <Scale className="h-7 w-7" />
                </div>
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Terms of Use</h1>
                    <p className="text-slate-500 mt-2 font-medium">Effective Date: December 19, 2025</p>
                </div>
            </div>
            <p className="text-slate-600 leading-relaxed max-w-2xl">
                Please read these terms carefully. By accessing or using the DermTrials platform ("Site"), you agree to be bound by these Terms and our Privacy Policy.
            </p>
          </header>

          <div className="prose prose-slate max-w-none text-slate-700 space-y-12 leading-relaxed">
            
            {/* SECTION 1: NATURE OF SERVICES */}
            <section>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-4">1. Nature of Our Services</h3>
              <div className="bg-amber-50 border border-amber-100 p-5 rounded-xl mb-6 text-sm text-amber-900">
                <strong>Important Notice:</strong> DermTrials is a digital patient recruitment platform. We are not a healthcare provider, medical office, or research site.
              </div>
              <p>The content and screening questionnaires provided by DermTrials are for <strong>informational and recruitment purposes only</strong>. Nothing on this platform constitutes medical advice, diagnosis, or treatment.</p>
              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li><strong>No Doctor-Patient Relationship:</strong> Using this Site does not establish a doctor-patient relationship. Always seek the advice of your physician regarding a medical condition.</li>
                <li><strong>Role of Platform:</strong> We connect interested candidates with third-party clinical researchers. We do not conduct the trials, control medical protocols, or guarantee acceptance into any study.</li>
              </ul>
            </section>

            {/* SECTION 2: COMMUNICATIONS */}
            <section>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-4">2. TCPA Consent & Communications</h3>
              <p>By providing your phone number and clicking "Submit" or "Check Eligibility", you provide your <strong>express written consent</strong> to receive calls, SMS/MMS text messages, and emails from DermTrials and our partner research sites.</p>
              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li><strong>Automated Technology:</strong> You acknowledge that communications may be sent using an automatic telephone dialing system (autodialer) or prerecorded voice.</li>
                <li><strong>Opt-Out:</strong> Consent is not a condition of purchase. You may opt-out of text messages at any time by replying "STOP."</li>
              </ul>
            </section>

            {/* SECTION 3: PROHIBITED USE */}
            <section>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-indigo-600" /> 3. Prohibited Conduct
              </h3>
              <p>You agree not to use the Site for any unlawful purpose. You agree not to:</p>
              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li><strong>Data Scraping:</strong> Use any robot, spider, scraper, or automated means to access the Site without our express written permission.</li>
                <li><strong>Reverse Engineering:</strong> Attempt to decompile or disassemble any aspect of the Site to access source code.</li>
                <li><strong>False Information:</strong> Knowingly provide false health information to qualify for a clinical trial.</li>
              </ul>
            </section>

            {/* SECTION 4: INTELLECTUAL PROPERTY */}
            <section>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-4">4. Intellectual Property</h3>
              <p>The Site and its original content, features, and functionality are owned by DermTrials and are protected by United States and international copyright, trademark, patent, trade secret, and other intellectual property laws.</p>
            </section>

            {/* SECTION 5: DISCLAIMERS & LIABILITY */}
            <section>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-4">5. Disclaimers & Limitation of Liability</h3>
              <p className="uppercase text-xs font-bold text-slate-500 mb-2">Limitation of Liability</p>
              <p>TO THE FULLEST EXTENT PERMITTED BY LAW, DERMTRIALS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SITE.</p>
            </section>

            {/* SECTION 6: DATA SOURCES */}
            <section className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-4">6. Data Sources & Attribution</h3>
              <p className="text-sm">This application uses publicly available data from the U.S. National Library of Medicine (NLM) at <a href="https://clinicaltrials.gov" target="_blank" className="text-indigo-600 font-bold hover:underline">ClinicalTrials.gov</a>.</p>
              <ul className="list-disc pl-5 mt-3 space-y-2 text-sm">
                <li><strong>Source Attribution:</strong> Study titles and criteria are sourced via the ClinicalTrials.gov API.</li>
                <li><strong>No Endorsement:</strong> DermTrials is not affiliated with, endorsed by, or sponsored by the NLM, NIH, or HHS.</li>
              </ul>
            </section>

            {/* SECTION 7: GOVERNING LAW (UPDATED TO GEORGIA) */}
            <section>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-4">7. Governing Law</h3>
              <p>These Terms shall be governed and construed in accordance with the laws of the State of Georgia, without regard to its conflict of law provisions.</p>
            </section>

            {/* SECTION 8: TERMINATION */}
            <section>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Ban className="h-5 w-5 text-indigo-600" /> 8. Termination
              </h3>
              <p>
                We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
              </p>
            </section>

            {/* SECTION 9: DISPUTE RESOLUTION (UPDATED TO ATLANTA, GA) */}
            <section>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Gavel className="h-5 w-5 text-indigo-600" /> 9. Dispute Resolution
              </h3>
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-sm">
                <p className="mb-3 font-bold text-slate-900">BINDING ARBITRATION AND CLASS ACTION WAIVER</p>
                <p>
                  Any dispute, claim, or controversy arising out of or relating to these Terms or the breach, termination, enforcement, interpretation, or validity thereof, including the determination of the scope or applicability of this agreement to arbitrate, shall be determined by arbitration in Atlanta, Georgia before one arbitrator. Judgment on the Award may be entered in any court having jurisdiction. This clause shall not preclude parties from seeking provisional remedies in aid of arbitration from a court of appropriate jurisdiction.
                </p>
                <p className="mt-3">
                  <strong>YOU AND DERMTRIALS AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING.</strong>
                </p>
              </div>
            </section>

            {/* SECTION 10: CONTACT */}
            <section>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-4">10. Contact Us</h3>
              <p className="text-slate-600 mb-6">If you have any questions about these Terms, please contact our compliance team:</p>
              <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg active:scale-95">
                <Mail className="h-4 w-4" /> Contact Support
              </button>
            </section>

          </div>
        </div>
      </div>

      {/* --- CONTACT SUPPORT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><MessageSquare className="h-5 w-5 text-indigo-600" /> Contact Support</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6">
              {success ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"><Send className="h-8 w-8" /></div>
                  <h4 className="text-xl font-bold text-slate-900 mb-2">Message Sent!</h4>
                  <p className="text-sm text-slate-500">Our team will review your inquiry shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label><input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="John Smith" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label><input required type="email" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="name@email.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                  </div>
                  <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Topic</label><select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}><option value="general_inquiry">General Inquiry</option><option value="legal">Legal / Privacy</option><option value="technical_issue">Technical Issue</option></select></div>
                  <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Message</label><textarea required rows={4} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="How can we help?" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} /></div>
                  <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />} {loading ? "Sending..." : "Submit Inquiry"}</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}