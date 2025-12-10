"use client";

import Link from "next/link";
import { usePathname } from 'next/navigation';
import { Search, ChevronRight } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  // Hide Navbar on specific admin routes
  if (pathname.startsWith('/admin')) return null;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        
        {/* LOGO: Clean & Trustworthy */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 transition-transform group-hover:scale-105">
            <span className="font-bold text-white">D</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Derm<span className="text-indigo-600">Trials</span>
          </span>
        </Link>

        {/* RIGHT SIDE NAVIGATION */}
        <div className="flex items-center gap-6">
          
          {/* Link 1: Conditions (The Menu) */}
          <Link 
            href="/conditions" 
            className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            Browse Conditions
          </Link>

          {/* Link 2: Find a Trial (Hidden on Home, Visible elsewhere) */}
          {!isHomePage && (
            <Link 
              href="/" 
              className="flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-slate-800 hover:shadow-xl transition-all hover:-translate-y-0.5"
            >
              <Search className="h-3.5 w-3.5" />
              Find a Trial
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}