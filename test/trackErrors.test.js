'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const {
  isOnTracUnsupportedResponse,
  normalizeCarrier
} = require('../lib/trackErrors.js')

function upstreamError(statusCode, body) {
  const err = new Error('Request failed')
  err.statusCode = statusCode
  err.error = body
  return err
}

test('normalizes OnTrac carrier spellings', () => {
  assert.equal(normalizeCarrier('OnTrac'), 'ontrac')
  assert.equal(normalizeCarrier(' on-trac '), 'ontrac')
  assert.equal(normalizeCarrier('ON_TRAC'), 'ontrac')
  assert.equal(normalizeCarrier('usps'), 'usps')
})

test('detects an explicit unsupported OnTrac carrier response', () => {
  const err = upstreamError(400, {
    carrier: ['This carrier is not supported for tracking.']
  })

  assert.equal(isOnTracUnsupportedResponse(err, 'ontrac'), true)
})

test('detects an explicit unavailable OnTrac tracking response', () => {
  const err = upstreamError(404, {
    detail: 'Tracking information is not available for this shipment.'
  })

  assert.equal(isOnTracUnsupportedResponse(err, 'OnTrac'), true)
})

test('detects structured unsupported tracking codes', () => {
  const err = upstreamError(422, {
    code: 'tracking_not_supported',
    message: 'Request rejected'
  })

  assert.equal(isOnTracUnsupportedResponse(err, 'ontrac'), true)
})

test('does not treat authentication failures as link-only eligible', () => {
  const err = upstreamError(401, {
    detail: 'Invalid ShippoToken or unsupported carrier account provided by the user'
  })

  assert.equal(isOnTracUnsupportedResponse(err, 'ontrac'), false)
})

test('does not treat provider outages as link-only eligible', () => {
  const err = upstreamError(503, {
    detail: 'Tracking provider is temporarily unavailable'
  })

  assert.equal(isOnTracUnsupportedResponse(err, 'ontrac'), false)
})

test('does not treat rate limits as link-only eligible', () => {
  const err = upstreamError(429, {
    detail: 'Too many tracking requests'
  })

  assert.equal(isOnTracUnsupportedResponse(err, 'ontrac'), false)
})

test('does not treat unrelated validation errors as link-only eligible', () => {
  const err = upstreamError(400, {
    detail: 'Item weight is required for this request'
  })

  assert.equal(isOnTracUnsupportedResponse(err, 'ontrac'), false)
})

test('does not treat a malformed tracking number as carrier unsupported', () => {
  const err = upstreamError(400, {
    detail: 'Invalid tracking number format'
  })

  assert.equal(isOnTracUnsupportedResponse(err, 'ontrac'), false)
})

test('does not apply the OnTrac fallback to other carriers', () => {
  const err = upstreamError(400, {
    detail: 'Carrier not supported for tracking'
  })

  assert.equal(isOnTracUnsupportedResponse(err, 'usps'), false)
})

test('does not classify a network error without an upstream response', () => {
  const err = new Error('socket hang up')
  assert.equal(isOnTracUnsupportedResponse(err, 'ontrac'), false)
})
