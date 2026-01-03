Supabase Folder Documentation
Overview: Location-Centric Data Model
This project uses a Normalized Source + Denormalized Cache architecture to handle clinical trial locations. This ensures high performance for the patient-facing frontend while maintaining strict data integrity for Researcher and Admin features.

1. The Source of Truth: trial_locations
All physical clinical trial sites are stored as individual rows in the trial_locations table.

Unique Identity: Each site is assigned a permanent UUID.

Stability: The sync engine uses an UPSERT logic based on a unique constraint (trial_id, facility_name, city).

Usage: This table powers the Researcher Dashboard (Claims), Admin Outreach Log, and Geographic Search (Distance Math).

2. The Performance Cache: trials.locations
The trials table contains a jsonb column named locations.

Automatic Sync: This column is never updated manually by the Next.js API. It is populated automatically by a PostgreSQL Trigger (trigger_update_locations_json).

Usage: This column powers the Trial Detail Page (Sidebar site list) and SEO Meta Tags. It allows the app to load a study and all 100+ of its locations in a single database request.

3. The URL & Quiz "Lock" Logic
To link a user's application to a specific site, the app uses the UUID from the trial_locations table.

URL Format: /trial/[NCT_ID]?location=[LOCATION_UUID]

Matching: The TrialClientLogic.tsx component matches the location parameter from the URL against the id field inside the trials.locations JSON array. If they match, the site is "Locked," and the lead is tied to that specific clinic.