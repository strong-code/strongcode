'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { ensureSchema, MIGRATIONS } = require('../lib/db/migrate.js')

test('adds tracking_mode with a safe live default and an idempotent guard', async () => {
  const statements = []
  const db = {
    none: async (sql) => {
      statements.push(sql)
    }
  }

  await ensureSchema(db)

  const columnMigration = statements.find(sql => /ADD COLUMN IF NOT EXISTS tracking_mode/.test(sql))
  assert.ok(columnMigration, 'expected an idempotent tracking_mode column migration')
  assert.match(columnMigration, /TEXT NOT NULL DEFAULT 'live'/)

  const constraintMigration = statements.find(sql => /shipments_tracking_mode_check/.test(sql))
  assert.ok(constraintMigration, 'expected a tracking_mode check constraint')
  assert.match(constraintMigration, /duplicate_object/)

  assert.equal(statements.length, MIGRATIONS.length)
})

test('re-running the migration is safe and issues the same guarded statements', async () => {
  const statements = []
  const db = {
    none: async (sql) => {
      statements.push(sql)
    }
  }

  await ensureSchema(db)
  const firstRun = statements.slice()
  await ensureSchema(db)

  assert.deepEqual(statements.slice(firstRun.length), firstRun)
  assert.ok(statements.every(sql => /IF NOT EXISTS|duplicate_object/.test(sql)))
})

test('propagates migration failures so startup can fail closed', async () => {
  const db = {
    none: async () => {
      throw new Error('permission denied for table shipments')
    }
  }

  await assert.rejects(ensureSchema(db), /permission denied/)
})
