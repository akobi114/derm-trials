import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const BASE_URL = "https://clinicaltrials.gov/api/v2/studies";

// --- FULL CONFIGURATION ---
const TARGET_CONDITIONS = [
  "Acne", 
  "Atopic Dermatitis", 
  "Psoriasis", 
  "Alopecia Areata", 
  "Hidradenitis Suppurativa", 
  "Vitiligo", 
  "Rosacea", 
  "Actinic Keratosis", 
  "Cutaneous Squamous Cell Carcinoma", 
  "Melasma"
];

const BATCH_SIZE = "10"; 

export async function GET() {
  try {
    console.log(`[SYNC] Starting Full Import (10 Conditions x 10 Trials)...`);
    const logs: string[] = [];
    let totalProcessed = 0;
    let newTrials = 0;
    let updatedTrials = 0;

    for (const condition of TARGET_CONDITIONS) {
      console.log(`   > Fetching: ${condition}...`);

      const params = new URLSearchParams({
        "query.cond": condition,        
        "query.locn": "United States",      
        "filter.overallStatus": "RECRUITING", 
        "pageSize": BATCH_SIZE, 
        "format": "json"
        // NO 'fields' param = Full Payload (Arms, Outcomes, Contacts included)
      });

      const url = `${BASE_URL}?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        logs.push(`${condition}: API Error ${response.status}`);
        continue;
      }

      const data = await response.json();
      const studies = data.studies || [];
      
      if (studies.length === 0) {
        logs.push(`${condition}: 0 found`);
      }
      
      for (const study of studies) {
        const proto = study.protocolSection;
        const nctId = proto.identificationModule?.nctId;
        
        if (!nctId) continue;
        totalProcessed++;

        // --- MAPPING ---
        const design = proto.designModule;
        const arms = proto.armsInterventionsModule;
        const outcomes = proto.outcomesModule;
        const contacts = proto.contactsLocationsModule;
        const conditions = proto.conditionsModule;

        // 1. Interventions
        let finalInterventions = [];
        if (arms?.armGroups) {
          finalInterventions = arms.armGroups.map((arm: any) => ({
            data_type: "arm_group",
            title: arm.title,
            description: arm.description,
            role: arm.type,
            interventions: arms.interventions?.filter((inv: any) => 
              inv.armGroupLabels?.includes(arm.label)
            ) || []
          }));
        } else if (arms?.interventions) {
          finalInterventions = arms.interventions.map((inv: any) => ({
            data_type: "intervention_list",
            name: inv.name,
            type: inv.type,
            description: inv.description
          }));
        }

        // 2. Outcomes
        const mapOutcome = (o: any) => ({
          measure: o.measure,
          timeFrame: o.timeFrame,
          description: o.description
        });
        const primaryOutcomes = outcomes?.primaryOutcomes?.map(mapOutcome) || [];
        const secondaryOutcomes = outcomes?.secondaryOutcomes?.map(mapOutcome) || [];

        // 3. Design
        const studyDesign = {
          allocation: design?.designInfo?.allocation,
          masking: design?.designInfo?.maskingInfo?.masking,
          primaryPurpose: design?.designInfo?.primaryPurpose,
          interventionModel: design?.designInfo?.interventionModel,
          observationalModel: design?.bioSpec?.retention
        };

        // 4. Locations & Contacts
        const usLocations = contacts?.locations?.filter((loc: any) => loc.country === "United States") || [];
        const centralContact = contacts?.centralContacts?.[0] || null;
        const keywords = conditions?.keywords || conditions?.conditions || [];

        // 5. Generate Location String (Critical Fix)
        const locationString = usLocations.length > 0 
            ? `${usLocations[0].city}, ${usLocations[0].state}` 
            : "United States";

        // --- SAVE ---
        const { data: existing } = await supabase
          .from('trials')
          .select('simple_summary, screener_questions, ai_benefits')
          .eq('nct_id', nctId)
          .single();

        const trialData: any = {
          nct_id: nctId,
          title: proto.identificationModule?.briefTitle,
          official_title: proto.identificationModule?.officialTitle,
          brief_summary: proto.descriptionModule?.briefSummary,
          detailed_summary: proto.descriptionModule?.detailedDescription,
          
          condition: condition, 
          conditions_list: keywords,
          
          sponsor: proto.sponsorCollaboratorsModule?.leadSponsor?.name,
          status: proto.statusModule?.overallStatus?.replace(/_/g, ' '),
          phase: design?.phases?.[0] || 'Not Applicable',
          study_type: design?.studyType,
          
          inclusion_criteria: proto.eligibilityModule?.eligibilityCriteria,
          gender: proto.eligibilityModule?.sex,
          minimum_age: proto.eligibilityModule?.minimumAge || "N/A",
          maximum_age: proto.eligibilityModule?.maximumAge || "N/A",
          healthy_volunteers: proto.eligibilityModule?.healthyVolunteers || false,
          
          study_design: studyDesign,
          interventions: finalInterventions,
          primary_outcomes: primaryOutcomes,
          secondary_outcomes: secondaryOutcomes,
          
          location: locationString, // Required field
          locations: usLocations,
          central_contact: centralContact,
          
          last_updated: new Date().toISOString()
        };

        if (existing) {
          trialData.simple_summary = existing.simple_summary;
          trialData.screener_questions = existing.screener_questions;
          trialData.ai_benefits = existing.ai_benefits;
          updatedTrials++;
        } else {
          trialData.simple_summary = null;
          newTrials++;
        }

        const { error } = await supabase.from('trials').upsert(trialData, { onConflict: 'nct_id' });
        
        if (error) {
          console.error(`DB Error ${nctId}:`, error.message);
          logs.push(`Error Saving ${nctId}: ${error.message}`);
        } else {
          // Geocoding
          await supabase.from('study_sites').delete().eq('nct_id', nctId);
          const sitesToInsert = [];
          for (const loc of usLocations) {
             let lat = loc.geoPoint?.lat || null;
             let lon = loc.geoPoint?.lon || null;
             if ((!lat || !lon) && loc.zip) {
                try {
                  const zipRes = await fetch(`https://api.zippopotam.us/us/${loc.zip}`);
                  if (zipRes.ok) {
                    const zipData = await zipRes.json();
                    if (zipData.places?.[0]) {
                      lat = parseFloat(zipData.places[0].latitude);
                      lon = parseFloat(zipData.places[0].longitude);
                    }
                  }
                } catch (err) { }
             }
             sitesToInsert.push({ nct_id: nctId, city: loc.city, state: loc.state, zip: loc.zip, country: loc.country, latitude: lat, longitude: lon, geo_point: (lat && lon) ? `POINT(${lon} ${lat})` : null });
          }
          if(sitesToInsert.length > 0) await supabase.from('study_sites').insert(sitesToInsert);
        }
      }
      
      // Gentle pause between conditions (1.5 seconds)
      await new Promise(r => setTimeout(r, 1500));
    }

    return NextResponse.json({ 
        success: true, 
        message: `Sync Complete. Processed ${totalProcessed}. New: ${newTrials}, Updated: ${updatedTrials}.`,
        logs 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}