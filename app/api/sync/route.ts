import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const BASE_URL = "https://clinicaltrials.gov/api/v2/studies";

// Helper for polite waiting with random "jitter"
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms + Math.random() * 2000));

export async function GET() {
  try {
    const logs: string[] = [];
    let totalProcessed = 0;
    let newTrials = 0;
    let updatedTrials = 0;

    // 1. QUEUE: Fetch 3 'pending' or 'partial' conditions
    const { data: queue, error: queueError } = await supabase
      .from('conditions')
      .select('title, slug, next_page_token, sync_status')
      .in('sync_status', ['pending', 'partial'])
      .order('sync_priority', { ascending: false })
      .order('last_synced_at', { ascending: true, nullsFirst: true })
      .limit(3);

    if (queueError || !queue || queue.length === 0) {
      return NextResponse.json({ message: "No pending tasks found." });
    }

    for (const item of queue) {
      console.log(`[SYNC] Processing: ${item.title}`);
      await supabase.from('conditions').update({ sync_status: 'syncing' }).eq('slug', item.slug);

      const params = new URLSearchParams({
        "query.cond": item.title,
        "query.locn": "United States",
        "filter.overallStatus": "RECRUITING",
        "pageSize": "20", // The Paced Speed for safe pagination
        "format": "json"
      });

      if (item.next_page_token) {
        params.append("pageToken", item.next_page_token);
      }

      let response = await fetch(`${BASE_URL}?${params.toString()}`);

      // --- 429 RATE LIMIT HANDLING (Single retry at 40s) ---
      if (response.status === 429) {
        console.warn(`[429] Limit hit. Waiting 40s before single retry...`);
        await wait(40000); 
        response = await fetch(`${BASE_URL}?${params.toString()}`);
        
        if (response.status === 429) {
          console.error(`[429] Final attempt failed. Stopping engine.`);
          await supabase.from('conditions').update({ 
            sync_status: 'error', 
            sync_error_message: 'Rate limit (429) exceeded after 40s retry.' 
          }).eq('slug', item.slug);
          break; 
        }
      }

      const data = await response.json();
      const studies = data.studies || [];
      const apiNextToken = data.nextPageToken;

      for (const study of studies) {
        const proto = study.protocolSection;
        const derived = study.derivedSection;
        const nctId = proto.identificationModule?.nctId;
        if (!nctId) continue;

        // --- 1. MESH & SYNONYM EXTRACTION (New Intelligence) ---
        const meshTerms = derived?.conditionBrowseModule?.meshes?.map((m: any) => m.term) || [];
        const meshAncestors = derived?.conditionBrowseModule?.ancestors?.map((a: any) => a.term) || [];
        const searchKeywords = Array.from(new Set([...meshTerms, ...meshAncestors]));

        // --- 2. FULL DATA MAPPING (Restored to 100% Original Parity) ---
        const design = proto.designModule;
        const arms = proto.armsInterventionsModule;
        const outcomes = proto.outcomesModule;
        const contacts = proto.contactsLocationsModule;
        const condModule = proto.conditionsModule;

        // Interventions mapping
        let finalInterventions = [];
        if (arms?.armGroups) {
          finalInterventions = arms.armGroups.map((arm: any) => ({
            data_type: "arm_group",
            title: arm.title,
            description: arm.description,
            role: arm.type,
            interventions: arms.interventions?.filter((inv: any) => inv.armGroupLabels?.includes(arm.label)) || []
          }));
        } else if (arms?.interventions) {
          finalInterventions = arms.interventions.map((inv: any) => ({
            data_type: "intervention_list",
            name: inv.name, type: inv.type, description: inv.description
          }));
        }

        const mapOutcome = (o: any) => ({ measure: o.measure, timeFrame: o.timeFrame, description: o.description });
        const rawLocations = contacts?.locations?.filter((loc: any) => loc.country === "United States") || [];
        
        const usLocations = rawLocations.map((loc: any) => ({
            facility: loc.facility, city: loc.city, state: loc.state, zip: loc.zip, country: loc.country,
            geoPoint: loc.geoPoint,
            location_contacts: loc.contacts?.map((c: any) => ({ 
              name: c.name || null, phone: c.phone || null, email: c.email || null, role: c.role || "Contact" 
            })) || [],
            investigators: loc.investigators?.map((i: any) => ({ 
              name: i.name || null, role: i.role || "Investigator" 
            })) || []
        }));

        const locationString = usLocations.length > 0 ? `${usLocations[0].city}, ${usLocations[0].state}` : "United States";
        const keywords = condModule?.keywords || condModule?.conditions || [];

        // --- 3. PRESERVE AI CUSTOMIZATIONS ---
        const { data: existing } = await supabase.from('trials').select('simple_summary, screener_questions, ai_benefits').eq('nct_id', nctId).single();

        const trialData: any = {
          nct_id: nctId,
          title: proto.identificationModule?.briefTitle,
          official_title: proto.identificationModule?.officialTitle,
          brief_summary: proto.descriptionModule?.briefSummary,
          detailed_summary: proto.descriptionModule?.detailedDescription,
          condition: item.title, 
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
          study_design: {
            allocation: design?.designInfo?.allocation,
            masking: design?.designInfo?.maskingInfo?.masking,
            primaryPurpose: design?.designInfo?.primaryPurpose,
            interventionModel: design?.designInfo?.interventionModel,
            observationalModel: design?.bioSpec?.retention // RESTORED
          },
          interventions: finalInterventions,
          primary_outcomes: outcomes?.primaryOutcomes?.map(mapOutcome) || [],
          secondary_outcomes: outcomes?.secondaryOutcomes?.map(mapOutcome) || [],
          location: locationString,
          locations: usLocations,
          central_contact: contacts?.centralContacts?.[0] || null,
          search_keywords: searchKeywords,
          last_updated: new Date().toISOString(),
          simple_summary: existing?.simple_summary || null,
          screener_questions: existing?.screener_questions || null,
          ai_benefits: existing?.ai_benefits || null
        };

        const { error: upsertErr } = await supabase.from('trials').upsert(trialData, { onConflict: 'nct_id' });
        
        if (!upsertErr) {
          existing ? updatedTrials++ : newTrials++;
          totalProcessed++;
          
          // --- 4. 3-TIER GEOCODING & STUDY_SITES ---
          await supabase.from('study_sites').delete().eq('nct_id', nctId);
          const sitesToInsert = [];

          for (const loc of usLocations) {
             let lat = null; let lon = null;
             if (loc.zip) {
                // Tier 1: Fast Cache
                const { data: cached } = await supabase.from('zip_coordinates').select('*').eq('zip_code', loc.zip).maybeSingle();
                if (cached) {
                    lat = cached.latitude; lon = cached.longitude;
                } else {
                    // Tier 2: Reference Table Fallback
                    const { data: fallback } = await supabase.from('zip_codes').select('latitude, longitude').eq('zip_code', loc.zip).maybeSingle();
                    if (fallback) {
                        lat = fallback.latitude; lon = fallback.longitude;
                        await supabase.from('zip_coordinates').insert({ zip_code: loc.zip, latitude: lat, longitude: lon });
                    } else {
                        // Tier 3: External API (Final Resort)
                        try {
                          const zRes = await fetch(`https://api.zippopotam.us/us/${loc.zip}`);
                          if (zRes.ok) {
                              const zD = await zRes.json();
                              lat = parseFloat(zD.places[0].latitude); lon = parseFloat(zD.places[0].longitude);
                              await supabase.from('zip_coordinates').insert({ zip_code: loc.zip, latitude: lat, longitude: lon });
                              await wait(1000); 
                          }
                        } catch (e) {}
                    }
                }
             }
             sitesToInsert.push({ nct_id: nctId, city: loc.city, state: loc.state, zip: loc.zip, country: loc.country, latitude: lat, longitude: lon, geo_point: (lat && lon) ? `POINT(${lon} ${lat})` : null });
          }
          if (sitesToInsert.length > 0) await supabase.from('study_sites').insert(sitesToInsert);
        }
      }

      // --- 5. CHECKPOINT UPDATE ---
      const nextStatus = apiNextToken ? 'partial' : 'completed';
      await supabase.from('conditions').update({ 
        sync_status: nextStatus, 
        next_page_token: apiNextToken || null,
        last_synced_at: new Date().toISOString() 
      }).eq('slug', item.slug);

      await wait(3000); 
    }

    return NextResponse.json({ success: true, processed: totalProcessed, new: newTrials, updated: updatedTrials });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}