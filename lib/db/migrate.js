'use strict'

// Idempotent schema updates for deployments that predate a migration framework.
// Every statement must be safe to run on each startup.
const MIGRATIONS = [
  "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE",
  "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP",
  "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS tracking_mode TEXT NOT NULL DEFAULT 'live'",
  `DO $$
   BEGIN
     ALTER TABLE shipments ADD CONSTRAINT shipments_tracking_mode_check
       CHECK (tracking_mode IN ('live', 'link_only'));
   EXCEPTION
     WHEN duplicate_object THEN NULL;
   END $$`
]

async function ensureSchema(db) {
  for (const statement of MIGRATIONS) {
    await db.none(statement)
  }
}

module.exports = {
  MIGRATIONS,
  ensureSchema
}
