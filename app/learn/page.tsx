"use client";

import { Suspense } from "react"; // Added Suspense
import { motion } from "framer-motion";
import { 
  CheckCircle2, 
  ShieldCheck, 
  Search, 
  MessageSquare, 
  ClipboardCheck, 
  Activity, 
  Microscope, 
  Users, 
  Globe, 
  Heart,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 }
};

// 1. Logic moved to internal component for Suspense wrapping
function LearnContent() {
  return (
    <div className="min-h-screen bg-white">
      {/* 1. HERO SECTION: THE EMOTIONAL HOOK */}
      <section className="relative h-[80vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/40 to-transparent z-10" />
          <img 
            src="/images/learn/hero-wellness.jpg" 
            alt="Wellness and Hope" 
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="relative z-20 max-w-7xl mx-auto px-6 w-full">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl text-white"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 backdrop-blur-md text-[11px] font-black uppercase tracking-[0.2em] mb-6">
              Empowering Patients through Education
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
              The Future of <br /> Medicine is <span className="text-indigo-400 text-glow">Collaborative.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-200 font-medium leading-relaxed mb-10 opacity-90">
              Clinical trials aren't just about testing new treatments—they're about real people coming together to solve the health challenges of tomorrow. 
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/search" className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all hover:scale-105 shadow-2xl shadow-indigo-500/20">
                Find a Study Near You
              </Link>
              <button 
                onClick={() => document.getElementById('journey')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold hover:bg-white/20 transition-all"
              >
                Learn the Process
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. THE PATH OF PROGRESS (The Patient Journey) */}
      <section id="journey" className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">Your Journey as a Participant</h2>
          <p className="text-slate-500 max-w-2xl mx-auto font-medium text-lg">
            Joining a study is a structured, supportive process designed to keep you informed and safe at every turn.
          </p>
        </div>

        <div className="max-w-5xl mx-auto px-6 relative">
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500/5 via-indigo-500/40 to-indigo-500/5 hidden md:block" />

          {[
            {
              step: "01",
              title: "The Discovery",
              desc: "It starts with curiosity. You search for a study that matches your condition. You'll answer a few simple 'Yes/No' questions to see if the study is a potential fit for your health history.",
              icon: Search,
              action: "Find your match"
            },
            {
              step: "02",
              title: "The Dialogue",
              desc: "Before any medical care happens, you have a deep conversation called 'Informed Consent.' A doctor explains every detail—the goals, the risks, and the schedule—so you can make a confident choice.",
              icon: MessageSquare,
              action: "Ask every question"
            },
            {
              step: "03",
              title: "The Health Check",
              desc: "You'll visit the clinic for a screening exam. This ensures the study is safe for you specifically. Often, this includes health tests and checkups at no cost to you.",
              icon: ClipboardCheck,
              action: "Confirm safety"
            },
            {
              step: "04",
              title: "The Active Care",
              desc: "Once enrolled, you receive the study treatment or standard care. You'll have regular visits where a dedicated medical team monitors your progress with world-class attention.",
              icon: Activity,
              action: "Receive treatment"
            }
          ].map((item, i) => (
            <motion.div 
              key={i}
              {...fadeInUp}
              className={`relative flex flex-col md:flex-row items-center mb-20 md:mb-32 last:mb-0 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
            >
              <div className="w-full md:w-[45%] group">
                <div className="bg-white p-8 md:p-10 rounded-[32px] border border-slate-200 shadow-sm transition-all hover:shadow-xl hover:border-indigo-200 relative z-20">
                  <span className="text-indigo-600 font-black text-sm tracking-widest uppercase mb-3 block">{item.step}</span>
                  <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 tracking-tight">{item.title}</h3>
                  <p className="text-slate-600 leading-relaxed font-medium mb-6 text-[15px]">{item.desc}</p>
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm group-hover:gap-3 transition-all">
                    <span>{item.action}</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
              <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 h-16 w-16 rounded-full bg-indigo-600 border-[6px] border-slate-50 shadow-lg items-center justify-center z-10">
                <item.icon className="h-7 w-7 text-white" />
              </div>
              <div className="hidden md:block w-[45%]" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3. UNDERSTANDING THE PHASES */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="relative rounded-[48px] overflow-hidden mb-16 p-12 md:p-24 text-center">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-slate-900/60 z-10" />
            <img 
              src="/images/learn/process-modern.jpg" 
              alt="Research Facility" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="relative z-20 text-white">
            <h2 className="text-3xl md:text-6xl font-black mb-6 tracking-tight">The Science of Certainty</h2>
            <p className="text-slate-200 font-medium max-w-2xl mx-auto text-lg md:text-xl leading-relaxed">
              Every medical breakthrough follows a rigorous, four-stage journey to ensure it is safe and effective for the people who need it most.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {[
            { phase: "Phase 1", focus: "Safety First", text: "Small groups to find safe dosages and identify initial side effects.", icon: Microscope, size: "h-2 w-2" },
            { phase: "Phase 2", focus: "Effectiveness", text: "Testing the treatment in a larger group to see if it truly works.", icon: Users, size: "h-4 w-4" },
            { phase: "Phase 3", focus: "Comparison", text: "Large studies to compare against the standard care used today.", icon: Heart, size: "h-8 w-8" },
            { phase: "Phase 4", focus: "Monitoring", text: "Tracking long-term safety and results after treatment is approved.", icon: Globe, size: "h-12 w-12" },
          ].map((p, i) => (
            <motion.div 
              key={i} 
              whileHover={{ y: -8 }}
              className="group p-8 rounded-[32px] bg-white border border-slate-200 hover:border-indigo-300 transition-all hover:shadow-2xl flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                  <p.icon className="h-6 w-6 text-indigo-600 group-hover:text-white transition-colors" />
                </div>
                <div className={`rounded-full bg-indigo-100 flex items-center justify-center ${p.size}`}>
                  <div className="h-full w-full bg-indigo-500 rounded-full animate-pulse opacity-40" />
                </div>
              </div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-1">{p.phase}</h4>
              <h5 className="text-xl font-black text-slate-900 mb-4">{p.focus}</h5>
              <p className="text-sm text-slate-500 leading-relaxed font-medium mt-auto">{p.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 4. TRUST & PROTECTION SECTION (FIXED 3-LINE HEADLINE) */}
      <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-indigo-600/5 blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 items-center gap-12 lg:gap-20 relative z-10">
          <motion.div {...fadeInUp}>
            <span className="text-indigo-400 font-black tracking-[0.2em] text-[10px] uppercase mb-6 block">Safety Commitment</span>
            
            {/* 3-LINE HEADLINE FOR OPTIMAL AESTHETICS */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-10 leading-[1.2] tracking-tight max-w-xl">
              <span className="block">Your well-being is the</span>
              <span className="block">single most important</span>
              <span className="text-indigo-400 italic font-medium block text-glow-indigo">part of every study.</span>
            </h2>
            
            <div className="space-y-8">
              {[
                { title: "IRB Watchdogs", text: "Independent Review Boards (IRBs) audit every study to protect your rights and well-being." },
                { title: "Personal Control", text: "Informed Consent means you are in charge. You can withdraw from any study, at any time, for any reason." },
                { title: "Strict Privacy", text: "Your health data is protected by rigorous security protocols and federal privacy laws." }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-5">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                    <ShieldCheck className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1 text-lg">{item.title}</h4>
                    <p className="text-slate-400 leading-relaxed text-sm font-medium">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="relative">
             <div className="aspect-[4/5] rounded-[48px] overflow-hidden border-[12px] border-white/5 shadow-2xl">
               <img src="/images/learn/safety-connection.jpg" alt="Safety and Connection" className="w-full h-full object-cover" />
             </div>
             <motion.div 
               initial={{ x: 20, opacity: 0 }}
               whileInView={{ x: 0, opacity: 1 }}
               className="absolute -bottom-8 -left-8 bg-white p-8 rounded-[32px] shadow-2xl text-slate-900 max-w-[200px]"
             >
                <ShieldCheck className="h-10 w-10 text-indigo-600 mb-4 mx-auto" />
                <p className="font-black leading-tight uppercase text-[11px] tracking-widest text-slate-400 mb-1 text-center">Standard of Care</p>
                <p className="font-bold text-sm text-slate-900 italic text-center leading-tight">Expert medical monitoring at every step.</p>
             </motion.div>
          </div>
        </div>
      </section>

      {/* 5. FINAL CTA SECTION */}
      <section className="py-32 text-center px-6 relative overflow-hidden bg-white">
        <div className="max-w-3xl mx-auto relative z-10">
          <Heart className="h-12 w-12 text-rose-500 mx-auto mb-8 animate-pulse" />
          <h2 className="text-4xl md:text-7xl font-black text-slate-900 mb-8 tracking-tight italic leading-tight">Ready to make an impact?</h2>
          <p className="text-slate-500 text-lg md:text-xl font-medium mb-12 leading-relaxed">
            New clinical trials open every day. Search our database to see which studies are currently looking for volunteers in your area.
          </p>
          <Link href="/search" className="inline-flex items-center justify-center px-12 py-5 rounded-full bg-slate-900 text-white font-bold hover:bg-indigo-600 transition-all hover:scale-105 shadow-2xl hover:shadow-indigo-200">
            Browse Active Trials
          </Link>
        </div>
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-64 h-64 bg-indigo-50 rounded-full blur-[100px] -z-10" />
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-64 h-64 bg-rose-50 rounded-full blur-[100px] -z-10" />
      </section>
    </div>
  );
}

// 2. Final export wrapped in Suspense for Next.js 16 build compliance
export default function LearnPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <LearnContent />
    </Suspense>
  );
}