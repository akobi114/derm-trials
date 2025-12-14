"use client";

import Link from "next/link";
import { usePathname, useRouter } from 'next/navigation';
import { Search, Lock, Menu, X, LogOut, LayoutDashboard } from "lucide-react";
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
    <nav className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 transition-transform group-hover:scale-105 shadow-md shadow-indigo-200">
            <span className="font-bold text-white">D</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Derm<span className="text-indigo-600">Trials</span>
          </span>
        </Link>

        {/* DESKTOP NAV */}
        <div className="hidden md:flex items-center gap-4 md:gap-8">
          
          <Link href="/conditions" className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors">
            Browse Conditions
          </Link>

          {/* RESEARCHER / LOGIN AREA */}
          <div className="flex items-center gap-3 border-l border-slate-200 pl-6 ml-2">
            
            {!isLoggedIn ? (
              <>
                <Link href="/researchers" className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">
                  For Researchers
                </Link>
                <Link 
                  href="/login" 
                  className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-2"
                >
                  <Lock className="h-3 w-3 opacity-50" />
                  Site Login
                </Link>
              </>
            ) : (
              <>
                {/* UPDATED: Points to Traffic Cop Page */}
                <Link href="/dashboard" className="text-sm font-bold text-indigo-600 flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                <button 
                  onClick={handleLogout}
                  className="text-sm font-bold text-slate-400 hover:text-red-600 transition-colors"
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
              className="hidden md:flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-slate-800 hover:shadow-xl transition-all hover:-translate-y-0.5 ml-2"
            >
              <Search className="h-3.5 w-3.5" />
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
        <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-4 shadow-xl absolute w-full left-0">
          <Link href="/conditions" className="block text-sm font-medium text-slate-600 py-2">Browse Conditions</Link>
          
          {!isLoggedIn ? (
            <>
              <Link href="/researchers" className="block text-sm font-bold text-indigo-600 py-2">For Researchers</Link>
              <Link href="/login" className="block text-sm font-bold text-slate-600 py-2">Site Login</Link>
            </>
          ) : (
            <>
              {/* UPDATED: Points to Traffic Cop Page */}
              <Link href="/dashboard" className="block text-sm font-bold text-indigo-600 py-2">Dashboard</Link>
              <button onClick={handleLogout} className="block w-full text-left text-sm font-bold text-red-600 py-2">Sign Out</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}