"use client";

import Link from "next/link";
import { usePathname, useRouter } from 'next/navigation';
import { Search, Lock, Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from '@/lib/supabase';

// Added hideSearch to interface for TypeScript prop validation
interface NavbarProps {
  transparent?: boolean;
  hideSearch?: boolean;
}

export default function Navbar({ transparent, hideSearch }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  const isHomePage = pathname === '/';
  const isSearchPage = pathname === '/search';
  const isResearcherPage = pathname === '/researchers';
  
  // --- NEW: Identify Conditions Atlas and Individual Result Pages ---
  const isConditionsPage = pathname === '/conditions';
  const isConditionResultPage = pathname?.startsWith('/condition/');
  
  // Logic updated to respect the hideSearch prop
  const shouldShowFindTrial = !isHomePage && !isSearchPage && !isResearcherPage && !hideSearch;

  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --- UPDATED: Prioritize explicit prop, fallback to route detection, restricted by scroll state ---
  const useTransparentMode = (
    transparent !== undefined 
      ? transparent 
      : (isHomePage || isResearcherPage || isConditionsPage || isConditionResultPage)
  ) && !isScrolled;

  if (pathname?.startsWith('/admin')) return null;

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    }
    checkSession();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    router.push('/');
    router.refresh(); 
  };

  return (
    <nav 
      className={`fixed top-0 z-[100] w-full transition-all duration-300 ${
        useTransparentMode 
          ? "bg-transparent border-transparent py-2" 
          : "bg-white/90 backdrop-blur-lg border-b border-gray-100 py-0 shadow-sm"
      }`}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        
       {/* LOGO AREA */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all shadow-lg ${
            useTransparentMode ? "bg-white/10 backdrop-blur-md shadow-none" : "bg-indigo-600 shadow-indigo-200"
          }`}>
            <span className="font-bold text-white text-lg">D</span>
          </div>
          
          <span className={`text-xl font-extrabold tracking-tight transition-colors ${
            useTransparentMode ? "text-white" : "text-slate-900"
          }`}>
            Derm<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6366f1] to-[#a855f7]">Trials</span>
          </span>
        </Link>

        {/* DESKTOP NAV */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/learn" className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${
            useTransparentMode ? "text-white/90 hover:text-white" : "text-slate-600 hover:text-indigo-600"
          }`}>
            Learn About Clinical Trials
          </Link>

          <Link href="/conditions" className={`text-sm font-semibold transition-colors ${
            useTransparentMode ? "text-white/90 hover:text-white" : "text-slate-600 hover:text-indigo-600"
          }`}>
            Browse Conditions
          </Link>

          <div className={`flex items-center gap-4 border-l pl-8 ml-2 transition-colors ${
            useTransparentMode ? "border-white/20" : "border-slate-200"
          }`}>
            {!isLoggedIn ? (
              <>
                <Link href="/researchers" className={`text-sm font-bold transition-colors ${
                  useTransparentMode ? "text-white/80 hover:text-white" : "text-slate-500 hover:text-indigo-600"
                }`}>
                  For Researchers
                </Link>
                <Link 
                  href="/login" 
                  className={`text-sm font-bold transition-all flex items-center gap-2 px-4 py-2 rounded-full ${
                    useTransparentMode 
                      ? "text-white bg-white/10 hover:bg-white/20" 
                      : "text-slate-700 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <Lock className={`h-3.5 w-3.5 opacity-50 ${useTransparentMode ? "text-white" : ""}`} />
                  Log In
                </Link>
              </>
            ) : (
              <>
                <Link href="/dashboard" className="text-sm font-bold text-indigo-600 flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                <button 
                  onClick={handleLogout}
                  className={`text-sm font-bold transition-colors p-2 rounded-full ${
                    useTransparentMode ? "text-white/60 hover:text-white" : "text-slate-400 hover:text-red-600 hover:bg-slate-50"
                  }`}
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {shouldShowFindTrial && (
            <Link 
              href="/" 
              className={`hidden md:flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold shadow-lg transition-all hover:-translate-y-0.5 ml-2 ${
                useTransparentMode 
                  ? "bg-white text-slate-900 hover:bg-slate-100 shadow-none" 
                  : "bg-slate-900 text-white shadow-indigo-500/20 hover:bg-slate-800"
              }`}
            >
              <Search className="h-4 w-4" />
              Find a Trial
            </Link>
          )}
        </div>

        {/* MOBILE MENU TOGGLE */}
        <button 
          className={`md:hidden p-2 transition-colors ${useTransparentMode ? "text-white" : "text-slate-600"}`} 
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-4 shadow-xl absolute w-full left-0 top-20 z-[110] animate-in slide-in-from-top-2">
          <Link href="/learn" className="block text-sm font-medium text-slate-600 py-2 border-b border-slate-50">
            Learn About Clinical Trials
          </Link>
          <Link href="/conditions" className="block text-sm font-medium text-slate-600 py-2 border-b border-slate-50">
            Browse Conditions
          </Link>
          
          {!isSearchPage && !isResearcherPage && !isConditionsPage && !isConditionResultPage && (
            <Link href="/" className="block text-sm font-bold text-slate-900 py-2 border-b border-slate-50">
              Find a Trial
            </Link>
          )}

          {!isLoggedIn ? (
            <>
              <Link href="/researchers" className="block text-sm font-bold text-indigo-600 py-2">For Researchers</Link>
              <Link href="/login" className="block text-sm font-bold text-slate-600 py-2">Site Login</Link>
            </>
          ) : (
            <>
              <Link href="/dashboard" className="block text-sm font-bold text-indigo-600 py-2">Dashboard</Link>
              <button onClick={handleLogout} className="block w-full text-left text-sm font-bold text-red-600 py-2">Sign Out</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}