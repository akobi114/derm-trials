import Link from "next/link";
import { Search } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        
        {/* Logo Area */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <span className="font-bold text-white">D</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Derm<span className="text-indigo-600">Trials</span>
          </span>
        </Link>

        {/* Desktop Navigation links */}
        <div className="hidden items-center gap-8 md:flex">
          <Link href="#" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
            Find a Trial
          </Link>
          <Link href="#" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
            Conditions
          </Link>
          <Link href="#" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
            For Researchers
          </Link>
        </div>

        {/* Sign In Button */}
        <div className="flex items-center gap-4">
          <button className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 hover:bg-slate-800 transition-all hover:scale-105">
            Sign In
          </button>
        </div>
      </div>
    </nav>
  );
}