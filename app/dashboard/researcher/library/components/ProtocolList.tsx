import React from 'react';
import { MapPin, Users, Settings2, Activity, UserPlus } from 'lucide-react';

interface ProtocolListProps {
  trials: any[];
  assignments: any[];
  roster: any[];
  canEdit: boolean;
  onManageTeam: (trial: any) => void;
}

export default function ProtocolList({ trials, assignments, roster, canEdit, onManageTeam }: ProtocolListProps) {
  
  return (
    <div className="grid grid-cols-1 gap-6">
      {trials.map((item) => {
        const trialData = item.trials; 
        const locationName = typeof item.site_location === 'object' && item.site_location?.facility_name
            ? item.site_location.facility_name 
            : (item.site_location || "Main Campus");

        const trialAssignments = assignments.filter(a => a.trial_id === item.nct_id);
        
        const getMembersByRole = (role: string) => {
            return trialAssignments
                .filter(a => a.role_on_trial === role)
                .map(a => roster.find(r => r.id === a.team_member_id))
                .filter(Boolean);
        };

        const pis = getMembersByRole('Principal Investigator');
        const subPis = getMembersByRole('Sub-Investigator');

        return (
          <div key={item.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 group">
            
            <div className="flex flex-col md:flex-row gap-8">
              {/* Left: Info */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    {trialData.nct_id}
                  </span>
                  <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${item.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    {item.status === 'approved' ? 'Active' : (item.status || 'Pending')}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 leading-tight max-w-3xl">
                  {trialData.official_title || "Untitled Protocol"}
                </h3>

                <div className="flex flex-wrap gap-6 pt-2">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wide">
                        <MapPin className="h-4 w-4 text-indigo-500" />
                        {locationName}
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wide">
                        <Activity className="h-4 w-4 text-indigo-500" />
                        {trialData.phase || "N/A"}
                    </div>
                </div>
              </div>

              {/* Right: Team & Actions */}
              <div className="flex flex-col items-end justify-between gap-6 min-w-[260px]">
                
                <div className="flex flex-col items-end gap-3 w-full">
                    {/* Principal Investigators */}
                    <div className="text-right w-full">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Principal Investigator(s)</p>
                        {pis.length > 0 ? (
                            <div className="flex flex-wrap justify-end gap-2">
                                {pis.map((m: any) => (
                                    <span key={m.id} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-[10px] font-bold border border-indigo-100">
                                        {m.first_name} {m.last_name}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <span className="text-[10px] text-slate-300 italic">None Assigned</span>
                        )}
                    </div>

                    {/* Sub Investigators */}
                    <div className="text-right w-full">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sub-Investigator(s)</p>
                        {subPis.length > 0 ? (
                            <div className="flex flex-wrap justify-end gap-2">
                                {subPis.map((m: any) => (
                                    <span key={m.id} className="bg-slate-50 text-slate-600 px-2 py-1 rounded text-[10px] font-bold border border-slate-100">
                                        {m.first_name} {m.last_name}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <span className="text-[10px] text-slate-300 italic">None Assigned</span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 mt-2">
                    {canEdit && (
                        <button 
                            onClick={() => onManageTeam(item)}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
                        >
                            <UserPlus className="h-3.5 w-3.5" /> Manage Team
                        </button>
                    )}
                </div>
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
}