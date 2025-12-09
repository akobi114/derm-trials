import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const BASE_URL = "https://clinicaltrials.gov/api/v2/studies";

export async function GET() {
  try {
    const TEST_CONDITION = "Acne"; 
    const TEST_LIMIT = "5"; 

    console.log(`[SYNC] Fetching data for: ${TEST_CONDITION}...`);
    
    const logs: string[] = [];
    let totalAdded = 0;

    const params = new URLSearchParams({
      "query.cond": TEST_CONDITION,        
      "query.locn": "United States",      
      "filter.overallStatus": "RECRUITING,ACTIVE_NOT_RECRUITING,NOT_YET_RECRUITING", 
      "pageSize": TEST_LIMIT, 
      "format": "json"
    });

    const response = await fetch(`${BASE_URL}?${params.toString()}`);
    if (!response.ok) return NextResponse.json({ error: `API Error` }, { status: 500 });

    const data = await response.json();
    const studies = data.studies || [];
    
    for (const study of studies) {
      const proto = study.protocolSection;
      const nctId = proto.identificationModule?.nctId;
      
      const briefTitle = proto.identificationModule?.briefTitle || "";
      const officialTitle = proto.identificationModule?.officialTitle || briefTitle;
      const sponsor = proto.sponsorCollaboratorsModule?.leadSponsor?.name || "Unknown Sponsor";
      const overallStatus = proto.statusModule?.overallStatus || "Unknown";
      const officialConditions = proto.conditionsModule?.conditions || [TEST_CONDITION]; 
      const startDate = proto.statusModule?.startDateStruct?.date || "N/A";
      const compDate = proto.statusModule?.primaryCompletionDateStruct?.date || "N/A";
      const lastUpdate = proto.statusModule?.lastUpdateSubmitDate || "N/A";
      
      const design = proto.designModule;
      const studyType = design?.studyType || "N/A";
      const phase = design?.phases?.[0] || "Not Applicable";
      
      const dInfo = design?.designInfo;
      const designData = {
        allocation: dInfo?.allocation || "N/A",
        masking: dInfo?.maskingInfo?.masking || "None",
        interventionModel: dInfo?.interventionModel || "N/A",
        primaryPurpose: dInfo?.primaryPurpose || "Treatment",
        observationalModel: design?.bioSpec?.retention || "N/A",
        timePerspective: design?.timePerspective || "N/A"
      };

      // Arms
      const armsModule = proto.armsInterventionsModule;
      const rawArms = armsModule?.armGroups || [];
      const rawInterventions = armsModule?.interventions || [];
      let finalInterventionsData = [];

      if (rawArms.length > 0) {
        finalInterventionsData = rawArms.map((arm: any) => ({
            data_type: "arm_group",
            title: arm.title,
            description: arm.description,
            role: arm.type,
            interventions: rawInterventions.filter((inv: any) => 
              inv.armGroupLabels && inv.armGroupLabels.includes(arm.label)
            ).map((inv: any) => ({ name: inv.name, type: inv.type, description: inv.description }))
        }));
      } else {
        finalInterventionsData = rawInterventions.map((inv: any) => ({
          data_type: "intervention_list",
          name: inv.name,
          type: inv.type,
          description: inv.description
        }));
      }

      // Outcomes
      const outcomes = proto.outcomesModule;
      const mapOutcome = (o: any) => ({
        measure: o.measure || "Undefined Measure",
        timeFrame: o.timeFrame || "Not specified",
        description: o.description || "" 
      });
      const primOutcomes = outcomes?.primaryOutcomes?.map(mapOutcome) || [];
      const secOutcomes = outcomes?.secondaryOutcomes?.map(mapOutcome) || [];
      const otherOutcomes = outcomes?.otherOutcomes?.map(mapOutcome) || [];

      // Locations
      const contacts = proto.contactsLocationsModule;
      const usLocations = contacts?.locations?.filter((loc: any) => loc.country === "United States") || [];
      
      const trialData = {
        nct_id: nctId,
        title: briefTitle,
        official_title: officialTitle,
        simple_title: briefTitle, 
        condition: TEST_CONDITION,
        sponsor: sponsor,
        phase: phase,
        study_type: studyType,
        status: overallStatus.replace(/_/g, ' '),
        start_date: startDate,
        completion_date: compDate,
        last_updated: lastUpdate,
        location: usLocations.length > 0 ? `${usLocations[0].city}, ${usLocations[0].state}` : "United States",
        gender: proto.eligibilityModule?.sex || "All",
        min_age: proto.eligibilityModule?.minimumAge || "N/A",
        max_age: proto.eligibilityModule?.maximumAge || "N/A",
        brief_summary: proto.descriptionModule?.briefSummary || "",        
        detailed_summary: proto.descriptionModule?.detailedDescription || "",  
        simple_summary: null,           
        inclusion_criteria: proto.eligibilityModule?.eligibilityCriteria || "See detailed description.",
        conditions_list: officialConditions, 
        study_design: designData,
        interventions: finalInterventionsData, 
        primary_outcomes: primOutcomes,
        secondary_outcomes: secOutcomes,
        other_outcomes: otherOutcomes, 
        locations: usLocations, 
        central_contact: contacts?.centralContacts?.[0] || null,
        tags: [TEST_CONDITION, phase, studyType]
      };

      const { error } = await supabase.from('trials').upsert(trialData, { onConflict: 'nct_id' });
      
      if (!error) {
        totalAdded++;
        logs.push(`Saved Trial: ${nctId}`);

        // ---------------------------------------------------------
        // SELF-HEALING LOCATION LOGIC (Using Zippopotam.us)
        // ---------------------------------------------------------
        
        // 1. Delete old sites for this trial (to prevent duplicates)
        await supabase.from('study_sites').delete().eq('nct_id', nctId);

        const sitesToInsert = [];

        // 2. Loop through each location and FIX missing coordinates
        for (const loc of usLocations) {
          let lat = loc.geoPoint?.lat || null;
          let lon = loc.geoPoint?.lon || null;

          // If GPS is missing but we have a Zip Code, fetch it!
          if ((!lat || !lon) && loc.zip) {
            try {
              // Ask Zippopotam for the coordinates of this zip
              const zipRes = await fetch(`https://api.zippopotam.us/us/${loc.zip}`);
              if (zipRes.ok) {
                const zipData = await zipRes.json();
                if (zipData.places && zipData.places[0]) {
                  lat = parseFloat(zipData.places[0].latitude);
                  lon = parseFloat(zipData.places[0].longitude);
                }
              }
            } catch (err) {
               // Ignore errors, skip geocoding for this site
            }
          }

          sitesToInsert.push({
            nct_id: nctId,
            city: loc.city,
            state: loc.state,
            zip: loc.zip,
            country: loc.country,
            latitude: lat,
            longitude: lon,
            // Create a PostGIS Point for math
            geo_point: (lat && lon) ? `POINT(${lon} ${lat})` : null 
          });
        }

        // 3. Insert the repaired sites
        if (sitesToInsert.length > 0) {
          await supabase.from('study_sites').insert(sitesToInsert);
          logs.push(`   - Added ${sitesToInsert.length} locations`);
        }
      } else {
        logs.push(`Error saving ${nctId}: ${error.message}`);
      }
    }

    return NextResponse.json({ success: true, message: `Sync Complete. Added ${totalAdded} trials with auto-geocoding.`, details: logs });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}