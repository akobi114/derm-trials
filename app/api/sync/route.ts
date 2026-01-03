import { NextResponse } from 'next/server';
// Switched to supabaseServer to ensure RLS is bypassed for background sync tasks
import { supabaseServer as supabase } from '@/lib/supabaseServer';

const BASE_URL = "https://clinicaltrials.gov/api/v2/studies";

// Helper for polite waiting with random "jitter"
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms + Math.random() * 2000));

export async function GET(request: Request) {
  try {
    // ==========================================
    // 1. SECURITY CHECK (Admin Only)
    // ==========================================
    // Retrieve the token from the Authorization header (Fixes 401 in Incognito)
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: "Unauthorized. No token provided." }, { status: 401 });
    }

    // Verify the user using the provided JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized. Invalid session." }, { status: 401 });
    }

    // We check the 'admins' table to verify they have the correct permissions.
    const { data: adminRecord, error: adminError } = await supabase
      .from('admins')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (adminError || !adminRecord) {
      console.warn(`Unauthorized sync attempt by user: ${user.email}`);
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    // ==========================================
    // 2. SYNC ENGINE LOGIC
    // ==========================================
    const logs: string[] = [];
    let totalProcessed = 0;
    let newTrials = 0;
    let updatedTrials = 0;

    // Fetch 3 'pending' or 'partial' conditions, including api_search_term and synonyms
    const { data: queue, error: queueError } = await supabase
      .from('conditions')
      .select('title, slug, api_search_term, synonyms, next_page_token, sync_status')
      .in('sync_status', ['pending', 'partial'])
      .order('sync_priority', { ascending: false })
      .order('last_synced_at', { ascending: true, nullsFirst: true })
      .limit(3);

    if (queueError || !queue || queue.length === 0) {
      return NextResponse.json({ message: "No pending tasks found." });
    }

    for (const item of queue) {
      // Use the surgically clean API search term if available, fallback to title
      const searchTerm = item.api_search_term || item.title;
      console.log(`[SYNC START] Processing condition: "${searchTerm}"`);
      
      await supabase.from('conditions').update({ sync_status: 'syncing' }).eq('slug', item.slug);

      const params = new URLSearchParams({
        "query.cond": searchTerm,
        "query.locn": "United States",
        "filter.overallStatus": "RECRUITING",
        "pageSize": "3", // Current test limit
        "format": "json"
      });

      if (item.next_page_token) {
        params.append("pageToken", item.next_page_token);
      }

      let response = await fetch(`${BASE_URL}?${params.toString()}`);

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

      console.log(`   > API returned ${studies.length} trials for "${searchTerm}"`);

      for (const study of studies) {
        const proto = study.protocolSection;
        const derived = study.derivedSection;
        const nctId = proto.identificationModule?.nctId;
        if (!nctId) continue;

        // --- 3. THOROUGH SEARCH KEYWORD EXTRACTION ---
        // We pull MeSH Terms and Ancestors (e.g., "Skin Diseases" for Eczema)
        const meshTerms = derived?.conditionBrowseModule?.meshes?.map((m: any) => m.term) || [];
        const meshAncestors = derived?.conditionBrowseModule?.ancestors?.map((a: any) => a.term) || [];
        
        // We pull Sponsor Keywords (e.g., "Acne inversa" for HS) and Official Condition terms
        const condModule = proto.conditionsModule;
        const sponsorKeywords = condModule?.keywords || [];
        const officialConditions = condModule?.conditions || [];

        // Parse any synonyms stored in our database for this condition
        const rawSynonyms = item.synonyms ? item.synonyms.split(',').map((s: string) => s.trim()) : [];

        // Combine ALL related terms for the "Secret Sauce" thorough search
        // This makes "Atopic Dermatitis" find "Eczema" and "Pimple" find "Acne"
        const searchKeywords = Array.from(new Set([
          ...meshTerms, 
          ...meshAncestors, 
          ...sponsorKeywords, 
          ...officialConditions,
          ...rawSynonyms,
          item.title,
          item.api_search_term || ""
        ])).filter(Boolean);

        // Combine sponsor keywords and official conditions for the conditions_list field
        const combinedConditionsList = Array.from(new Set([...officialConditions, ...sponsorKeywords]));

        const design = proto.designModule;
        const arms = proto.armsInterventionsModule;
        const outcomes = proto.outcomesModule;
        const contacts = proto.contactsLocationsModule;

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
            status: loc.status,
            location_contacts: loc.contacts?.map((c: any) => ({ 
              name: c.name || null, phone: c.phone || null, email: c.email || null, role: c.role || "Contact" 
            })) || [],
            investigators: loc.investigators?.map((i: any) => ({ 
              name: i.name || null, role: i.role || "Investigator" 
            })) || []
        }));

        const locationString = usLocations.length > 0 ? `${usLocations[0].city}, ${usLocations[0].state}` : "United States";

        const { data: existing } = await supabase.from('trials').select('simple_summary, screener_questions, ai_benefits').eq('nct_id', nctId).single();

        /**
         * NOTE: 'locations' is deliberately omitted from trialData.
         * The database Trigger (update_trial_locations_json) handles the 
         * automatic population of the trials.locations JSONB cache based 
         * on refined data from the trial_locations table.
         */
        const trialData: any = {
          nct_id: nctId,
          title: proto.identificationModule?.briefTitle,
          official_title: proto.identificationModule?.officialTitle,
          brief_summary: proto.descriptionModule?.briefSummary,
          detailed_summary: proto.descriptionModule?.detailedDescription,
          // UPDATED: Use the official database title to ensure category page links work correctly
          condition: item.title,
          conditions_list: combinedConditionsList,
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
            observationalModel: design?.bioSpec?.retention
          },
          interventions: finalInterventions,
          primary_outcomes: outcomes?.primaryOutcomes?.map(mapOutcome) || [],
          secondary_outcomes: outcomes?.secondaryOutcomes?.map(mapOutcome) || [],
          location: locationString,
          central_contact: contacts?.centralContacts?.[0] || null,
          // UPDATED: Exhaustive list of search terms from MeSH, Sponsors, and Synonyms
          search_keywords: searchKeywords,
          last_updated: new Date().toISOString(),
          simple_summary: existing?.simple_summary || null,
          screener_questions: existing?.screener_questions || null,
          ai_benefits: existing?.ai_benefits || null
        };

        const { data: trialRecord, error: upsertErr } = await supabase
          .from('trials')
          .upsert(trialData, { onConflict: 'nct_id' })
          .select('id')
          .single();
        
        if (!upsertErr && trialRecord) {
          existing ? updatedTrials++ : newTrials++;
          totalProcessed++;
          
          const sitesToInsert = [];

          for (const loc of usLocations) {
             let lat = null;
             let lon = null;
             
             if (loc.zip) {
                const { data: cached } = await supabase.from('zip_coordinates').select('*').eq('zip_code', loc.zip).maybeSingle();
                if (cached) {
                    lat = cached.latitude; lon = cached.longitude;
                } else {
                    const { data: fallback } = await supabase.from('zip_codes').select('latitude, longitude').eq('zip_code', loc.zip).maybeSingle();
                    if (fallback) {
                        lat = fallback.latitude; lon = fallback.longitude;
                        await supabase.from('zip_coordinates').insert({ zip_code: loc.zip, latitude: lat, longitude: lon });
                    } else {
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

             if (!lat && !lon && loc.geoPoint) {
                lat = loc.geoPoint.lat;
                lon = loc.geoPoint.lon;
             }

             const siteNumberMatch = loc.facility?.match(/Site Number\s*:\s*(\d+)/i);

             sitesToInsert.push({ 
                trial_id: trialRecord.id, 
                facility_name: loc.facility,
                site_number: siteNumberMatch ? siteNumberMatch[1] : null,
                city: loc.city, 
                state: loc.state, 
                zip: loc.zip, 
                lat: lat, 
                lon: lon,
                status: loc.status?.replace(/_/g, ' ') || 'RECRUITING',
                location_contacts: loc.location_contacts,
                investigators: loc.investigators
             });
          }
          
          if (sitesToInsert.length > 0) {
            // DUPLICATE FILTER: Ensures unique Facility+City combo per trial
            const uniqueSites = sitesToInsert.filter((site, index, self) =>
              index === self.findIndex((s) => (
                s.facility_name === site.facility_name && s.city === site.city
              ))
            );

            const { error: locError } = await supabase
              .from('trial_locations')
              .upsert(uniqueSites, { onConflict: 'trial_id,facility_name,city' });

            if (locError) {
              console.error(`     - [ERROR] Site sync failed for ${nctId}:`, locError.message);
            } else {
              console.log(`     - [LOCATION SYNC] ${nctId}: Synced ${uniqueSites.length} unique site rows.`);
            }
          }
        }
      }

      const nextStatus = apiNextToken ? 'partial' : 'completed';
      await supabase.from('conditions').update({ 
        sync_status: nextStatus, 
        next_page_token: apiNextToken || null,
        last_synced_at: new Date().toISOString() 
      }).eq('slug', item.slug);
      
      console.log(`[SYNC COMPLETE] Condition: "${searchTerm}" | Status: ${nextStatus}`);

      await wait(3000); 
    }

    return NextResponse.json({ success: true, processed: totalProcessed, new: newTrials, updated: updatedTrials });
  } catch (err: any) {
    console.error("Critical Sync Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}