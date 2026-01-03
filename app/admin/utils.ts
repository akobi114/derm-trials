import { Gem, Medal, Shield, AlertCircle } from "lucide-react";

export type TierType = 'diamond' | 'gold' | 'silver' | 'mismatch';

export const calculateTier = (lead: any, questions: any[]) => {
    if (!questions || questions.length === 0) return null;
    let correct = 0;
    let wrong = 0;
    let unsure = 0;
    const total = questions.length;

    questions.forEach((q: any, i: number) => {
        const ans = lead.answers && lead.answers[i];
        if (ans === q.correct_answer) {
            correct++;
        } else if (ans && (ans.toLowerCase().includes("know") || ans.toLowerCase().includes("unsure"))) {
            unsure++;
        } else {
            wrong++;
        }
    });

    const mismatchRate = wrong / total;
    let tier: { label: string, icon: any, style: string, type: TierType };

    if (wrong === 0 && unsure === 0) tier = { label: "Perfect Match", icon: Gem, style: "bg-emerald-50 text-emerald-700 border-emerald-100", type: 'diamond' };
    else if (wrong === 0) tier = { label: "Likely Match", icon: Medal, style: "bg-amber-50 text-amber-700 border-amber-100", type: 'gold' };
    else if (mismatchRate <= 0.20) tier = { label: "Needs Review", icon: Shield, style: "bg-slate-100 text-slate-600 border-slate-200", type: 'silver' };
    else tier = { label: "Mismatch", icon: AlertCircle, style: "bg-rose-50 text-rose-700 border-rose-100", type: 'mismatch' };

    const detail = `(${correct}/${total} Met${unsure > 0 ? `, ${unsure} Unsure` : ''}${wrong > 0 ? `, ${wrong} Missed` : ''})`;
    return { ...tier, detail };
};

export const isSameLocation = (lead: any, claimLoc: any) => {
    if (!claimLoc) return false;
    const claimId = claimLoc.id || claimLoc.location_id;
    if (lead.location_id && claimId && lead.location_id === claimId) {
        return true;
    }
    if (lead.site_facility && claimLoc.facility) {
        if (lead.site_facility.trim().toLowerCase() === claimLoc.facility.trim().toLowerCase()) return true;
    }
    const clean = (str: string) => (str || "").toLowerCase().trim().replace(/[^a-z]/g, "");
    const lCity = clean(lead.site_city);
    const cCity = clean(claimLoc.city);
    const lState = clean(lead.site_state);
    const cState = clean(claimLoc.state);

    if (lCity && cCity && lCity === cCity && lState === cState) return true;
    return false;
};

/**
 * Surgically identifies the best contact method for a specific lead
 * based on the trial's registered locations and central contact data.
 */
export const getContactStrategy = (lead: any) => {
    let location = null;
    if (lead.trial_locations) {
        // Find the specific facility record that matches the patient's location
        location = lead.trial_locations.find((l: any) => isSameLocation(lead, l));
    }

    const localContacts = [
        ...(location?.location_contacts || []),
        ...(location?.investigators || [])
    ];
    
    // Facility name fallback: use lead's captured facility or the joined location facility
    const facility = lead.site_facility || location?.facility;
    
    // Construct full address for UI visibility
    const fullAddress = location ? `${location.city}, ${location.state} ${location.zip || ''}` : null;
    
    // Centralized contact info (usually for the sponsor/CRO)
    const central = lead.trial_central;

    return { 
        location, 
        localContacts, 
        facility, 
        fullAddress, 
        central 
    };
};