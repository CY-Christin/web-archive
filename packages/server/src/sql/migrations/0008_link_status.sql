-- Migration number: 0008 	 2026-07-02T00:00:00.000Z
-- Manual link-health check ("原链接健康检测"). Written by POST /api/pages/recheck.
-- linkStatus: 'live' | 'dead' | 'redirect'; NULL = never probed (UI shows no badge).
-- lastChecked: UTC CURRENT_TIMESTAMP of the last probe; NULL = never probed.
ALTER TABLE pages ADD COLUMN linkStatus TEXT;
ALTER TABLE pages ADD COLUMN lastChecked DATETIME;
