'use strict'

// Only client-side Shippo responses can describe a carrier/tracking limitation.
// Auth, rate limiting, provider outages and network failures must never trigger
// the link-only fallback.
const UNSUPPORTED_STATUSES = new Set([400, 404, 422])

const UNSUPPORTED_PHRASE = '(?:not\\s+supported|unsupported|not\\s+available|unavailable|does\\s+not\\s+support|not\\s+enabled|not\\s+eligible)'
const CARRIER_UNSUPPORTED = new RegExp(
  `\\bcarrier\\b[^.|]{0,60}\\b${UNSUPPORTED_PHRASE}\\b|\\b${UNSUPPORTED_PHRASE}\\b[^.|]{0,60}\\bcarrier\\b`,
  'i'
)
const TRACKING_UNSUPPORTED = new RegExp(
  `\\btrack(?:ing)?\\b[^.|]{0,60}\\b(?:not\\s+supported|unsupported|not\\s+available|unavailable|not\\s+found|could\\s+not\\s+be\\s+found|no\\s+(?:tracking|track))\\b`,
  'i'
)
const UNSUPPORTED_CODE = /\b(?:carrier[_ -]?not[_ -]?supported|unsupported[_ -]?carrier|tracking[_ -]?not[_ -]?supported|tracking[_ -]?unavailable|tracking[_ -]?not[_ -]?found)\b/i

function normalizeCarrier(carrier) {
  return String(carrier || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function isOnTrac(carrier) {
  return normalizeCarrier(carrier) === 'ontrac'
}

function collectText(value, out = [], depth = 0) {
  if (depth > 4 || out.length > 100 || value === null || value === undefined) return out

  if (typeof value === 'string') {
    out.push(value)
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    out.push(String(value))
  } else if (Array.isArray(value)) {
    value.forEach(entry => collectText(entry, out, depth + 1))
  } else if (typeof value === 'object') {
    Object.keys(value).forEach(key => {
      out.push(key)
      collectText(value[key], out, depth + 1)
    })
  }

  return out
}

function upstreamBody(err) {
  if (!err || typeof err !== 'object') return null
  if (err.error !== undefined && err.error !== null) return err.error
  if (err.body !== undefined && err.body !== null) return err.body
  if (err.response && err.response.body !== undefined) return err.response.body
  return null
}

// Returns true only for an explicit, client-side OnTrac carrier/tracking
// limitation reported by Shippo. Everything else stays an upstream failure.
function isOnTracUnsupportedResponse(err, carrier) {
  if (!isOnTrac(carrier)) return false

  const status = Number(err && (err.statusCode || err.status))
  if (!UNSUPPORTED_STATUSES.has(status)) return false

  const body = upstreamBody(err)
  if (body === null) return false

  let text = collectText(body).join(' | ')
  if (!text) return false

  // Some clients expose the raw JSON body as a string.
  if (typeof body === 'string' && /^[\[{]/.test(body.trim())) {
    try {
      text += ' | ' + collectText(JSON.parse(body)).join(' | ')
    } catch (e) {
      // Not JSON; the raw text is still checked below.
    }
  }

  return CARRIER_UNSUPPORTED.test(text) ||
    TRACKING_UNSUPPORTED.test(text) ||
    UNSUPPORTED_CODE.test(text)
}

module.exports = {
  isOnTracUnsupportedResponse,
  isOnTrac,
  normalizeCarrier
}
