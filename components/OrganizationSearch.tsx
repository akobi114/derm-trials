"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Building2, Plus, Search, Check, Loader2, 
  MapPin, CheckCircle2, Users, AlertCircle 
} from 'lucide-react';

interface OrganizationSearchProps {
  onSelect: (org: { id: string | null, name: string }) => void;
  defaultValue?: string;
}

export default function OrganizationSearch({ onSelect, defaultValue }: OrganizationSearchProps) {
  const [query, setQuery] = useState(defaultValue || "");
  const [existingOrgs, setExistingOrgs] = useState<any[]>([]);
  const [facilityMatches, setFacilityMatches] = useState<any[]>([]); 
  const [searching, setSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchEverything = async (val: string) => {
    setQuery(val);
    if (val.length < 3) {
      setExistingOrgs([]);
      setFacilityMatches([]);
      return;
    }

    setSearching(true);
    setIsOpen(true);
    
    // --- UPDATED: Parallel search using 'facility_name' per your database schema ---
    const [orgRes, facilityRes] = await Promise.all([
        supabase.from('organizations').select('id, name, is_verified').ilike('name', `%${val}%`).limit(5),
        supabase.from('trial_locations').select('facility_name, city, state').ilike('facility_name', `%${val}%`).limit(10)
    ]);

    setExistingOrgs(orgRes.data || []);
    
    // --- UPDATED: DEDUPLICATION LOGIC ---
    // 1. Identify organizations already registered on the platform
    const existingNames = new Set((orgRes.data || []).map(o => o.name.toLowerCase()));
    
    // 2. Filter trial data to only show facilities NOT yet registered, and remove duplicates
    const uniqueFacilities: any[] = [];
    const seenNames = new Set();

    (facilityRes.data || []).forEach(f => {
        const name = f.facility_name?.trim();
        const lowerName = name?.toLowerCase();
        if (name && !existingNames.has(lowerName) && !seenNames.has(lowerName)) {
            uniqueFacilities.push(f);
            seenNames.add(lowerName);
        }
    });
    
    setFacilityMatches(uniqueFacilities);
    setSearching(false);
  };

  const handleSelect = (org: any) => {
    setQuery(org.name);
    setIsOpen(false);
    onSelect({ id: org.id, name: org.name });
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative group">
        <Building2 className={`absolute left-3 top-3.5 h-5 w-5 transition-colors ${isOpen ? 'text-indigo-600' : 'text-slate-400'}`} />
        <input
          type="text"
          placeholder="Search e.g. 'Alliance Dermatology'..."
          className="w-full pl-10 p-4 bg-white border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-slate-900 font-bold shadow-sm"
          value={query}
          onChange={(e) => searchEverything(e.target.value)}
          onFocus={() => query.length >= 3 && setIsOpen(true)}
        />
        {searching && <Loader2 className="absolute right-4 top-4 h-5 w-5 animate-spin text-indigo-500" />}
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-2 bg-white border border-slate-200 rounded-[1.5rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 max-h-[450px] overflow-y-auto">
          
          {/* CATEGORY 1: EXISTING TEAMS */}
          {existingOrgs.length > 0 && (
            <div className="p-2 border-b border-slate-50">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest p-3 flex items-center gap-2">
                <Users className="h-3 w-3" /> Clinics Already on DermTrials
              </p>
              {existingOrgs.map((org) => (
                <button key={org.id} onClick={() => handleSelect(org)} className="w-full flex items-center justify-between p-4 hover:bg-indigo-50 rounded-xl transition-all text-left group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white border border-slate-100 rounded-lg text-indigo-600 shadow-sm"><CheckCircle2 className="h-4 w-4" /></div>
                    <div className="font-bold text-slate-900">{org.name}</div>
                  </div>
                  <span className="text-[10px] font-black text-indigo-600 uppercase opacity-0 group-hover:opacity-100 transition-opacity">Request Access</span>
                </button>
              ))}
            </div>
          )}

          {/* CATEGORY 2: VERIFIED SITES (UPDATED FOR facility_name) */}
          {facilityMatches.length > 0 && (
            <div className="p-2 border-b border-slate-50 bg-slate-50/50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest p-3 flex items-center gap-2">
                <MapPin className="h-3 w-3" /> Found in Official Trial Data
              </p>
              {facilityMatches.map((f, idx) => (
                <button key={idx} onClick={() => handleSelect({ id: null, name: f.facility_name })} className="w-full flex items-center justify-between p-4 hover:bg-white hover:shadow-md rounded-xl transition-all text-left border border-transparent hover:border-slate-100 group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><MapPin className="h-4 w-4" /></div>
                    <div>
                        <div className="text-sm font-bold text-slate-800">{f.facility_name}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">{f.city}, {f.state}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 uppercase transition-opacity">Claim This Site</span>
                </button>
              ))}
            </div>
          )}

          {/* CATEGORY 3: CUSTOM FALLBACK */}
          <div className="p-2">
            <button
              onClick={() => handleSelect({ id: null, name: query })}
              className="w-full p-4 bg-white hover:bg-slate-50 rounded-xl transition-all text-slate-500 font-bold text-sm flex items-center gap-4 group"
            >
              <div className="p-2 bg-slate-100 text-slate-400 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-colors"><Plus className="h-4 w-4" /></div>
              <div>
                <div className="text-sm font-bold text-slate-600">Use "{query}"</div>
                <div className="text-[10px] text-slate-400 font-medium">Create a custom name for my organization</div>
              </div>
            </button>
          </div>

          <div className="bg-amber-50 p-4 border-t border-amber-100 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
              <strong>Site Precision:</strong> If your organization has multiple branches, please select the specific location to anchor your team's dashboard.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}