-- Migration number: 0009 	 2026-07-05T00:00:00.000Z
-- Sub-classification of the 'unknown' link status ("探活未知态细分"). Written by POST /api/pages/recheck.
-- linkStatusReason: 'cf-blocked' = the probe hit a Cloudflare challenge/block page;
-- NULL = no specific reason (including all rows probed before this migration — refreshed on next probe).
ALTER TABLE pages ADD COLUMN linkStatusReason TEXT;
