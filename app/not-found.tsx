import Link from 'next/link'
import { FileQuestion, ArrowLeft, Search } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
 
export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="text-center max-w-lg mx-auto">
          {/* Icon */}
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <FileQuestion className="h-10 w-10 text-indigo-600" />
          </div>

          {/* Text */}
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Page Not Found</h2>
          <p className="text-slate-500 text-lg mb-8 leading-relaxed">
            We couldn't find the page you were looking for. It might have been moved, deleted, or the link may be incorrect.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg"
            >
              <ArrowLeft className="h-4 w-4" /> Back Home
            </Link>
            <Link 
              href="/conditions"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-full hover:bg-slate-50 transition-all"
            >
              <Search className="h-4 w-4" /> Browse Trials
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}