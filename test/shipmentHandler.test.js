'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const proxyquire = require('proxyquire')

function makeDb(queues = {}) {
  const calls = { oneOrNone: [], one: [], manyOrNone: [], none: [], result: [], tx: [] }
  const pending = {
    oneOrNone: (queues.oneOrNone || []).slice(),
    one: (queues.one || []).slice(),
    manyOrNone: (queues.manyOrNone || []).slice(),
    none: (queues.none || []).slice(),
    result: (queues.result || []).slice()
  }

  function record(kind, sql, params) {
    calls[kind].push({ sql, params })
    if (pending[kind].length === 0) return undefined
    const next = pending[kind].shift()
    if (next instanceof Error) throw next
    return next
  }

  return {
    calls,
    oneOrNone: async (sql, params) => record('oneOrNone', sql, params),
    one: async (sql, params) => record('one', sql, params),
    manyOrNone: async (sql, params) => record('manyOrNone', sql, params),
    none: async (sql, params) => record('none', sql, params),
    result: async (sql, params) => record('result', sql, params),
    tx: async (fn) => {
      calls.tx.push(true)
      return fn({
        none: async (sql, params) => record('none', sql, params),
        result: async (sql, params) => record('result', sql, params)
      })
    }
  }
}

function loadHandler(db) {
  return proxyquire('../lib/shipmentHandler.js', {
    './db/db.js': db,
    'request-promise-native': async () => {
      throw new Error('Unexpected real provider call in unit test')
    },
    '@noCallThru': true
  })
}

test('creates a link-only shipment without status history or provider calls', async () => {
  const db = makeDb({ oneOrNone: [null] })
  const handler = loadHandler(db)

  const result = await handler.createLinkOnlyShipment(
    'ONTRAC123456789',
    'OnTrac',
    'Synthetic test item'
  )

  assert.equal(result.s, 201)
  assert.equal(result.data.tracking_mode, 'link_only')
  assert.equal(result.data.status, null)
  assert.equal(result.data.updated_at, null)
  assert.equal(db.calls.none.length, 1)

  const insert = db.calls.none[0]
  assert.match(insert.sql, /INSERT INTO shipments/)
  assert.match(insert.sql, /tracking_mode/)
  assert.deepEqual(insert.params.slice(0, 3), [
    'ONTRAC123456789',
    'ontrac',
    'Synthetic test item'
  ])
  assert.ok(insert.params.includes('link_only'))
  assert.equal(db.calls.none.filter(c => /shipment_status/.test(c.sql)).length, 0)
})

test('returns the existing live record and history on a duplicate fallback add', async () => {
  const db = makeDb({
    oneOrNone: [
      {
        tracking_number: 'ONTRAC123456789',
        carrier: 'ontrac',
        item: 'Synthetic test item',
        delivered: false,
        archived: true,
        tracking_mode: 'live'
      },
      {
        tracking_number: 'ONTRAC123456789',
        carrier: 'ontrac',
        item: 'Synthetic test item',
        eta: null,
        delivered: false,
        delivered_at: null,
        status: 'In transit',
        location: 'Portland, OR',
        updated_at: '2026-11-25T00:00:00.000Z',
        tracking_mode: 'live',
        archived: false
      }
    ]
  })
  const handler = loadHandler(db)

  const result = await handler.createLinkOnlyShipment(
    'ONTRAC123456789',
    'ontrac',
    'Synthetic test item'
  )

  assert.equal(result.s, 201)
  assert.equal(result.data.tracking_mode, 'live')
  assert.equal(result.data.status, 'In transit')
  assert.equal(db.calls.none.length, 1)
  assert.match(db.calls.none[0].sql, /SET archived = false/)
  assert.doesNotMatch(db.calls.none[0].sql, /tracking_mode\s*=/)
  assert.equal(db.calls.none.filter(c => /shipment_status/.test(c.sql)).length, 0)
})

test('is idempotent for an already-active link-only record', async () => {
  const db = makeDb({
    oneOrNone: [
      {
        tracking_number: 'ONTRAC123456789',
        carrier: 'ontrac',
        item: null,
        delivered: false,
        archived: false,
        tracking_mode: 'link_only'
      },
      {
        tracking_number: 'ONTRAC123456789',
        carrier: 'ontrac',
        item: null,
        eta: null,
        delivered: false,
        delivered_at: null,
        status: null,
        location: null,
        updated_at: null,
        tracking_mode: 'link_only',
        archived: false
      }
    ]
  })
  const handler = loadHandler(db)

  const result = await handler.createLinkOnlyShipment(
    'ONTRAC123456789',
    'ontrac',
    null
  )

  assert.equal(result.s, 200)
  assert.equal(result.data.tracking_mode, 'link_only')
  assert.equal(db.calls.none.length, 0)
})

test('does not create a link-only duplicate for a delivered shipment', async () => {
  const db = makeDb({
    oneOrNone: [
      {
        tracking_number: 'ONTRAC123456789',
        carrier: 'ontrac',
        delivered: true,
        delivered_at: '2026-11-01T00:00:00.000Z',
        archived: false,
        tracking_mode: 'live'
      }
    ]
  })
  const handler = loadHandler(db)

  const result = await handler.createLinkOnlyShipment(
    'ONTRAC123456789',
    'ontrac',
    null
  )

  assert.equal(result.s, 409)
  assert.equal(db.calls.none.length, 0)
  assert.match(result.msg, /already delivered/)
})

test('live creation persists tracking_mode live and returns it', async () => {
  const db = makeDb({ oneOrNone: [null] })
  const handler = loadHandler(db)

  const result = await handler.createShipment(
    {
      tracking_number: 'ONTRAC123456789',
      carrier: 'ontrac',
      origin: 'Portland, OR',
      eta: null,
      tracking_status: null,
      tracking_history: []
    },
    'Synthetic test item'
  )

  assert.equal(result.s, 201)
  assert.equal(result.data.tracking_mode, 'live')

  const insert = db.calls.none[0]
  assert.match(insert.sql, /tracking_mode/)
  assert.ok(insert.params.includes('live'))
})

test('a live duplicate preserves tracking_mode and existing history', async () => {
  const db = makeDb({
    oneOrNone: [
      {
        tracking_number: 'ONTRAC123456789',
        carrier: 'ontrac',
        delivered: false,
        archived: true,
        tracking_mode: 'live'
      },
      {
        tracking_number: 'ONTRAC123456789',
        carrier: 'ontrac',
        item: 'Synthetic test item',
        eta: null,
        delivered: false,
        delivered_at: null,
        status: 'Delivered to front door',
        location: 'Portland, OR',
        updated_at: '2026-11-25T00:00:00.000Z',
        tracking_mode: 'live'
      }
    ]
  })
  const handler = loadHandler(db)

  const result = await handler.createShipment({
    tracking_number: 'ONTRAC123456789',
    carrier: 'ontrac',
    eta: null
  })

  assert.equal(result.s, 201)
  assert.equal(result.data.tracking_mode, 'live')
  assert.equal(result.data.status, 'Delivered to front door')
  assert.equal(db.calls.none.filter(c => /shipment_status/.test(c.sql)).length, 0)
  assert.doesNotMatch(db.calls.oneOrNone[1].sql, /tracking_mode\s*=/)
})

test('getAllActive reads persisted tracking_mode from the database', async () => {
  const db = makeDb({
    manyOrNone: [
      [
        {
          tracking_number: 'ONTRAC123456789',
          carrier: 'ontrac',
          item: 'Synthetic test item',
          eta: null,
          status: null,
          location: null,
          updated_at: null,
          delivered: false,
          delivered_at: null,
          tracking_mode: 'link_only'
        }
      ]
    ]
  })
  const handler = loadHandler(db)

  const rows = await handler.getAllActive()

  assert.equal(rows[0].tracking_mode, 'link_only')
  assert.match(db.calls.manyOrNone[0].sql, /tracking_mode/)
})

test('getLatestStatus does not invent a label-created status for a link-only record', async () => {
  const db = makeDb({
    oneOrNone: [
      null,
      { tracking_mode: 'link_only', item: 'Synthetic test item', eta: null }
    ]
  })
  const handler = loadHandler(db)

  const latest = await handler.getLatestStatus('ONTRAC123456789')

  assert.equal(latest.data, null)
  assert.equal(latest.tracking_mode, 'link_only')
  assert.equal(latest.item, 'Synthetic test item')
})

test('link-only mode survives a fresh handler instance and appears in the active list', async () => {
  const store = []
  const db = {
    oneOrNone: async (sql, params) => {
      if (/SELECT \* FROM shipments WHERE tracking_number = \$1/.test(sql)) {
        return store.find(row => row.tracking_number === params[0]) || null
      }
      if (/LEFT JOIN shipment_status/.test(sql)) {
        const row = store.find(entry => entry.tracking_number === params[0])
        return row ? { ...row, status: null, location: null, updated_at: null } : null
      }
      return null
    },
    none: async (sql, params) => {
      if (/INSERT INTO shipments/.test(sql)) {
        store.push({
          tracking_number: params[0],
          carrier: params[1],
          item: params[2],
          delivered: false,
          delivered_at: null,
          archived: false,
          tracking_mode: params[3]
        })
      }
    },
    manyOrNone: async (sql) => {
      if (/row_num/.test(sql)) {
        return store
          .filter(row => !row.archived)
          .map(row => ({ ...row, status: null, location: null, updated_at: null }))
      }
      return []
    }
  }

  const firstInstance = loadHandler(db)
  const created = await firstInstance.createLinkOnlyShipment(
    'ONTRAC123456789',
    'ontrac',
    'Synthetic test item'
  )
  assert.equal(created.data.tracking_mode, 'link_only')

  const reloadedInstance = loadHandler(db)
  const rows = await reloadedInstance.getAllActive()

  assert.equal(rows.length, 1)
  assert.equal(rows[0].tracking_number, 'ONTRAC123456789')
  assert.equal(rows[0].tracking_mode, 'link_only')
  assert.equal(rows[0].status, null)
})
