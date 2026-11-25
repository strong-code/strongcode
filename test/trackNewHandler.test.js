'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { createTrackNewHandler } = require('../lib/trackNewHandler.js')

function responseRecorder() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    send(body) {
      this.body = body
      return this
    }
  }
  return res
}

function fakeShipment(overrides = {}) {
  const calls = {
    postShippoTrack: [],
    createShipment: [],
    createLinkOnlyShipment: []
  }

  return {
    calls,
    postShippoTrack: async (...args) => {
      calls.postShippoTrack.push(args)
      if (overrides.postShippoTrack) return overrides.postShippoTrack(...args)
      return {
        tracking_number: 'ONTRAC123456789',
        carrier: 'ontrac',
        tracking_status: null,
        tracking_history: []
      }
    },
    createShipment: async (...args) => {
      calls.createShipment.push(args)
      if (overrides.createShipment) return overrides.createShipment(...args)
      return {
        s: 201,
        msg: 'Shipment added',
        data: {
          tracking_number: 'ONTRAC123456789',
          carrier: 'ontrac',
          item: null,
          eta: null,
          status: null,
          location: null,
          delivered: false,
          delivered_at: null,
          updated_at: null,
          tracking_mode: 'live'
        }
      }
    },
    createLinkOnlyShipment: async (...args) => {
      calls.createLinkOnlyShipment.push(args)
      if (overrides.createLinkOnlyShipment) return overrides.createLinkOnlyShipment(...args)
      return {
        s: 201,
        msg: 'Link-only tracking entry added',
        data: {
          tracking_number: 'ONTRAC123456789',
          carrier: 'ontrac',
          item: null,
          eta: null,
          status: null,
          location: null,
          delivered: false,
          delivered_at: null,
          updated_at: null,
          tracking_mode: 'link_only'
        }
      }
    }
  }
}

function makeReq(body) {
  return { body }
}

const validBody = {
  tracking_number: 'ONTRAC123456789',
  carrier: 'ontrac',
  item: 'Synthetic test item'
}

test('creates a live record on a normal Shippo success', async () => {
  const shipment = fakeShipment()
  const res = responseRecorder()

  await createTrackNewHandler({ shipment })(makeReq(validBody), res)

  assert.equal(res.statusCode, 201)
  assert.equal(res.body.shipment.tracking_mode, 'live')
  assert.equal(shipment.calls.postShippoTrack.length, 1)
  assert.equal(shipment.calls.createShipment.length, 1)
  assert.equal(shipment.calls.createLinkOnlyShipment.length, 0)
})

test('persists link_only automatically on an explicit unsupported OnTrac response', async () => {
  const shipErr = new Error('Shippo rejected the request')
  shipErr.statusCode = 400
  shipErr.error = { carrier: ['This carrier is not supported for tracking.'] }

  const shipment = fakeShipment({
    postShippoTrack: async () => {
      throw shipErr
    }
  })
  const res = responseRecorder()

  await createTrackNewHandler({ shipment })(makeReq(validBody), res)

  assert.equal(res.statusCode, 201)
  assert.equal(res.body.shipment.tracking_mode, 'link_only')
  assert.equal(shipment.calls.postShippoTrack.length, 1)
  assert.equal(shipment.calls.createShipment.length, 0)
  assert.equal(shipment.calls.createLinkOnlyShipment.length, 1)
  assert.deepEqual(shipment.calls.createLinkOnlyShipment[0], [
    'ONTRAC123456789',
    'ontrac',
    'Synthetic test item'
  ])
})

test('ignores a client supplied tracking_mode and still makes one provider call', async () => {
  const shipment = fakeShipment()
  const res = responseRecorder()

  await createTrackNewHandler({ shipment })(
    makeReq({ ...validBody, tracking_mode: 'link_only' }),
    res
  )

  assert.equal(res.statusCode, 201)
  assert.equal(res.body.shipment.tracking_mode, 'live')
  assert.equal(shipment.calls.postShippoTrack.length, 1)
  assert.equal(shipment.calls.createLinkOnlyShipment.length, 0)
})

test('returns a sanitized 502 on a provider outage without writing to the database', async () => {
  const shipErr = new Error('connect ETIMEDOUT 10.0.0.1')
  shipErr.statusCode = 503
  shipErr.error = { detail: 'upstream stack trace and internal host' }

  const shipment = fakeShipment({
    postShippoTrack: async () => {
      throw shipErr
    }
  })
  const res = responseRecorder()

  await createTrackNewHandler({ shipment })(makeReq(validBody), res)

  assert.equal(res.statusCode, 502)
  assert.equal(shipment.calls.createShipment.length, 0)
  assert.equal(shipment.calls.createLinkOnlyShipment.length, 0)
  assert.equal(res.body.code, undefined)
  assert.doesNotMatch(res.body.error, /ETIMEDOUT|stack trace|10\.0\.0\.1/)
})

test('returns a sanitized 502 on an authentication failure', async () => {
  const shipErr = new Error('Unauthorized')
  shipErr.statusCode = 401
  shipErr.error = { detail: 'Invalid ShippoToken' }

  const shipment = fakeShipment({
    postShippoTrack: async () => {
      throw shipErr
    }
  })
  const res = responseRecorder()

  await createTrackNewHandler({ shipment })(makeReq(validBody), res)

  assert.equal(res.statusCode, 502)
  assert.equal(shipment.calls.createLinkOnlyShipment.length, 0)
  assert.doesNotMatch(res.body.error, /ShippoToken|Unauthorized/)
})

test('does not apply link-only fallback to an unrecognized 400 response', async () => {
  const shipErr = new Error('Bad request')
  shipErr.statusCode = 400
  shipErr.error = { detail: 'Item weight is required' }

  const shipment = fakeShipment({
    postShippoTrack: async () => {
      throw shipErr
    }
  })
  const res = responseRecorder()

  await createTrackNewHandler({ shipment })(makeReq(validBody), res)

  assert.equal(res.statusCode, 502)
  assert.equal(shipment.calls.createLinkOnlyShipment.length, 0)
})

test('does not apply link-only fallback to a non-OnTrac carrier', async () => {
  const shipErr = new Error('Bad request')
  shipErr.statusCode = 400
  shipErr.error = { detail: 'Carrier not supported for tracking' }

  const shipment = fakeShipment({
    postShippoTrack: async () => {
      throw shipErr
    }
  })
  const res = responseRecorder()

  await createTrackNewHandler({ shipment })(
    makeReq({ ...validBody, carrier: 'usps' }),
    res
  )

  assert.equal(res.statusCode, 502)
  assert.equal(shipment.calls.createLinkOnlyShipment.length, 0)
})

test('returns a sanitized 500 when link-only persistence fails', async () => {
  const shipErr = new Error('not supported')
  shipErr.statusCode = 400
  shipErr.error = { detail: 'Carrier not supported for tracking' }

  const shipment = fakeShipment({
    postShippoTrack: async () => {
      throw shipErr
    },
    createLinkOnlyShipment: async () => {
      throw new Error('relation "shipments" does not exist')
    }
  })
  const res = responseRecorder()

  await createTrackNewHandler({ shipment })(makeReq(validBody), res)

  assert.equal(res.statusCode, 500)
  assert.doesNotMatch(res.body.error, /relation|shipments/)
})

test('returns a sanitized 500 when a successful provider response cannot be saved', async () => {
  const shipment = fakeShipment({
    createShipment: async () => {
      throw new Error('duplicate key value violates unique constraint')
    }
  })
  const res = responseRecorder()

  await createTrackNewHandler({ shipment })(makeReq(validBody), res)

  assert.equal(res.statusCode, 500)
  assert.equal(shipment.calls.postShippoTrack.length, 1)
  assert.doesNotMatch(res.body.error, /duplicate key|constraint/)
})

test('returns success with the existing tracking_mode on a repeat link-only add', async () => {
  const shipErr = new Error('not supported')
  shipErr.statusCode = 400
  shipErr.error = { detail: 'Carrier not supported for tracking' }

  const shipment = fakeShipment({
    postShippoTrack: async () => {
      throw shipErr
    },
    createLinkOnlyShipment: async () => ({
      s: 200,
      msg: 'Shipment is already tracked',
      data: {
        tracking_number: 'ONTRAC123456789',
        carrier: 'ontrac',
        item: 'Synthetic test item',
        eta: null,
        status: null,
        location: null,
        delivered: false,
        delivered_at: null,
        updated_at: null,
        tracking_mode: 'link_only'
      }
    })
  })
  const res = responseRecorder()

  await createTrackNewHandler({ shipment })(makeReq(validBody), res)

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.shipment.tracking_mode, 'link_only')
  assert.equal(shipment.calls.postShippoTrack.length, 1)
  assert.equal(shipment.calls.createLinkOnlyShipment.length, 1)
})

test('rejects missing tracking_number or carrier without calling Shippo', async () => {
  for (const body of [
    { carrier: 'ontrac' },
    { tracking_number: 'ONTRAC123456789' },
    { tracking_number: '   ', carrier: 'ontrac' }
  ]) {
    const shipment = fakeShipment()
    const res = responseRecorder()

    await createTrackNewHandler({ shipment })(makeReq(body), res)

    assert.equal(res.statusCode, 400)
    assert.equal(shipment.calls.postShippoTrack.length, 0)
  }
})

test('rejects malformed tracking numbers without calling Shippo', async () => {
  const shipment = fakeShipment()
  const res = responseRecorder()

  await createTrackNewHandler({ shipment })(
    makeReq({ tracking_number: 'bad number!', carrier: 'ontrac' }),
    res
  )

  assert.equal(res.statusCode, 400)
  assert.equal(shipment.calls.postShippoTrack.length, 0)
})
