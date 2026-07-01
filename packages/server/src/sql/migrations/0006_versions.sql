-- Migration number: 0006 	 2026-07-01T00:00:01.000Z
-- Snapshot history for pages. The `pages` row always holds the latest version's
-- content pointers (contentUrl/screenshotId/title/pageDesc); prior versions are
-- archived here when a page is re-saved in "new version" mode.
CREATE TABLE IF NOT EXISTS page_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pageId INTEGER NOT NULL,
    title TEXT NOT NULL,
    pageDesc TEXT NOT NULL DEFAULT '',
    contentUrl TEXT NOT NULL,
    screenshotId TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_page_versions_pageId ON page_versions(pageId);
