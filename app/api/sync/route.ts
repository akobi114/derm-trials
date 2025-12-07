import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const BASE_URL = "https://clinicaltrials.gov/api/v2/studies";

export async function GET() {
  try {
    // 1. Get conditions from Supabase
    const { data: conditions, error: dbError } = await supabase
      .from('conditions')
      .select('title'); 

    if (dbError || !conditions || conditions.length === 0) {
      return NextResponse.json({ error: "No conditions found in database." }, { status: 400 });
    }

    let totalAdded = 0;
    const resultsLog: string[] = [];

    // 2. Loop through EACH condition
    for (const cond of conditions) {
      const conditionName = cond.title;
      
      // BUILD THE QUERY
      // Switch to 'query.locn' for US locations (more reliable than filter.geo)
      const params = new URLSearchParams({
        "query.cond": conditionName,        
        "query.locn": "United States",      
        "filter.overallStatus": "RECRUITING", 
        "pageSize": "5",                    
        "format": "json"
      });

      console.log(`Fetching trials for: ${conditionName}...`);
      
      const response = await fetch(`${BASE_URL}?${params.toString()}`);

      // ERROR HANDLING: Check if API returned an error (e.g. 400 Bad Request)
      if (!response.ok) {
        const textError = await response.text();
        console.error(`API Error for ${conditionName}:`, textError);
        resultsLog.push(`Error fetching ${conditionName}: ${textError}`);
        continue; // Skip this condition and try the next one
      }

      const data = await response.json();
      const studies = data.studies || [];
      
      // 3. Process the trials
      for (const study of studies) {
        const protocol = study.protocolSection;
        const identification = protocol.identificationModule;
        const locations = protocol.contactsLocationsModule;
        const description = protocol.descriptionModule;
        const eligibility = protocol.eligibilityModule;
        const statusModule = protocol.statusModule;

        const nctId = identification.nctId;
        const title = identification.briefTitle || identification.officialTitle;
        const summary = description?.briefSummary || "";
        const criteria = eligibility?.eligibilityCriteria || "";
        const overallStatus = statusModule?.overallStatus || "Unknown";

        // Find US Location
        const usLocation = locations?.locations?.find((loc: any) => loc.country === "United States");
        const locationString = usLocation ? `${usLocation.city}, ${usLocation.state}` : "USA";

        const trialData = {
          nct_id: nctId,
          title: title,
          simple_title: title, 
          condition: conditionName, 
          location: locationString,
          status: overallStatus.replace(/_/g, ' '), 
          compensation: "See Details",
          
          detailed_summary: summary,
          simple_summary: summary,
          inclusion_criteria: criteria,
          
          tags: ["Clinical Trial", conditionName, overallStatus.replace(/_/g, ' ')]
        };

        const { error } = await supabase
          .from('trials')
          .upsert(trialData, { onConflict: 'nct_id' });

        if (!error) totalAdded++;
      }
      resultsLog.push(`${conditionName}: ${studies.length} found`);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sync Complete. Processed ${totalAdded} trials.`,
      details: resultsLog 
    });

  } catch (error: any) {
    console.error("Sync Critical Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}