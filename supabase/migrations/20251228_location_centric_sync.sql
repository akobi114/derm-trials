-- ==========================================
-- 1. SCHEMA UPGRADE
-- ==========================================
-- Add columns to trial_locations to support Admin outreach and persistent data storage.
ALTER TABLE trial_locations 
ADD COLUMN IF NOT EXISTS location_contacts jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS investigators jsonb DEFAULT '[]'::jsonb;

-- Create a unique constraint to ensure stable UUIDs.
-- This allows the sync script to "UPSERT" data without changing IDs,
-- which prevents breaking Researcher Claims and Candidate Quiz links.
ALTER TABLE trial_locations 
ADD CONSTRAINT unique_trial_facility_city 
UNIQUE (trial_id, facility_name, city);


-- ==========================================
-- 2. THE SELF-HEALING TRIGGER
-- ==========================================
-- This function automatically gathers all locations for a trial and 
-- repopulates the trials.locations JSONB column whenever a site is changed.

CREATE OR REPLACE FUNCTION update_trial_locations_json()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE trials
    SET locations = (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', id,
                'city', city,
                'state', state,
                'zip', zip,
                'status', status,
                'facility', facility_name,
                'lat', lat,
                'lon', lon,
                'location_contacts', location_contacts,
                'investigators', investigators
            )
        )
        FROM trial_locations
        WHERE trial_id = COALESCE(NEW.trial_id, OLD.trial_id)
    )
    WHERE id = COALESCE(NEW.trial_id, OLD.trial_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach the watcher to the trial_locations table
DROP TRIGGER IF EXISTS trigger_update_locations_json ON trial_locations;
CREATE TRIGGER trigger_update_locations_json
AFTER INSERT OR UPDATE OR DELETE ON trial_locations
FOR EACH ROW EXECUTE FUNCTION update_trial_locations_json();


-- ==========================================
-- 3. GLOBAL SYNC (BACKFILL)
-- ==========================================
-- Run this one-time command to sync existing table data into the JSON columns.
-- Note: This will overwrite trials.locations with data from trial_locations.

UPDATE trials t
SET locations = (
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', tl.id,
            'city', tl.city,
            'state', tl.state,
            'zip', tl.zip,
            'status', tl.status,
            'facility', tl.facility_name,
            'lat', tl.lat,
            'lon', tl.lon,
            'location_contacts', tl.location_contacts,
            'investigators', tl.investigators
        )
    )
    FROM trial_locations tl
    WHERE tl.trial_id = t.id
);