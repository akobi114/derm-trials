import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrialGrid from "@/components/TrialGrid";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      {/* On Home, we pass an empty query to show ALL Featured trials */}
      <TrialGrid searchQuery="" />
    </main>
  );
}