-- Migration number: 0005 	 2026-07-01T00:00:00.000Z
-- Full-text search over archived pages.
-- Standalone FTS5 table keyed by rowid = pages.id. `content` is the plain text
-- extracted server-side from the page HTML stored in R2 (see utils/htmlToText).
-- The `trigram` tokenizer gives substring matching that works for both CJK and
-- Latin scripts without a word-segmentation dependency (queries need >= 3 chars).
CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
    title,
    pageDesc,
    content,
    tokenize = 'trigram'
);
