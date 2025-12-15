"use client";

import Link from "next/link";
import { usePathname, useRouter } from 'next/navigation';
import { Search, Lock, Menu, X, LogOut, LayoutDashboard, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isHomePage = pathname === '/';
  
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Hide Navbar on specific admin routes
  if (pathname?.startsWith('/admin')) return null;

  // Check Session on Load
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
    <nav className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/90 backdrop-blur-lg transition-all">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 transition-transform group-hover:scale-105 shadow-lg shadow-indigo-200">
            <span className="font-bold text-white text-lg">D</span>
          </div>
          <span className="text-xl font-extrabold tracking-tight text-slate-900">
            Derm<span className="text-indigo-600">Trials</span>
          </span>
        </Link>

        {/* DESKTOP NAV */}
        <div className="hidden md:flex items-center gap-8">
          
          <Link href="/learn" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors flex items-center gap-1.5">
            How it Works
          </Link>

          <Link href="/conditions" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
            Browse Conditions
          </Link>

          {/* RESEARCHER / LOGIN AREA */}
          <div className="flex items-center gap-4 border-l border-slate-200 pl-8 ml-2">
            
            {!isLoggedIn ? (
              <>
                <Link href="/researchers" className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">
                  For Researchers
                </Link>
                <Link 
                  href="/login" 
                  className="text-sm font-bold text-slate-700 hover:text-slate-900 transition-colors flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full hover:bg-slate-100"
                >
                  <Lock className="h-3.5 w-3.5 opacity-50" />
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
                  className="text-sm font-bold text-slate-400 hover:text-red-600 transition-colors p-2 hover:bg-slate-50 rounded-full"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* PATIENT CTA (Hidden on Home) */}
          {!isHomePage && (
            <Link 
              href="/" 
              className="hidden md:flex items-center gap-2 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-slate-800 hover:shadow-xl transition-all hover:-translate-y-0.5 ml-2"
            >
              <Search className="h-4 w-4" />
              Find a Trial
            </Link>
          )}
        </div>

        {/* MOBILE MENU TOGGLE */}
        <button className="md:hidden p-2 text-slate-600" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-4 shadow-xl absolute w-full left-0 top-20 z-40 animate-in slide-in-from-top-2">
          <Link href="/learn" className="block text-sm font-medium text-slate-600 py-2 border-b border-slate-50">How it Works</Link>
          <Link href="/conditions" className="block text-sm font-medium text-slate-600 py-2 border-b border-slate-50">Browse Conditions</Link>
          
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