"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Construct full URL (e.g., /search?q=acne)
    const fullUrl = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    // Get existing history from Session Storage
    const storageKey = "dermtrials_nav_history";
    const history = JSON.parse(window.sessionStorage.getItem(storageKey) || "[]");

    // Avoid duplicate back-to-back entries (e.g. double clicks)
    if (history.length > 0 && history[history.length - 1] === fullUrl) return;

    // Add new URL and keep only last 5
    const newHistory = [...history, fullUrl].slice(-5);
    window.sessionStorage.setItem(storageKey, JSON.stringify(newHistory));
    
  }, [pathname, searchParams]);

  return null; // It's invisible
}