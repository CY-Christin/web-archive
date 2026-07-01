-- Migration number: 0007 	 2026-07-01T00:00:02.000Z
-- Optional emoji icon per tag (Raindrop-style). NULL/empty falls back to a colour dot.
ALTER TABLE tags ADD COLUMN icon TEXT;
