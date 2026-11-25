'use strict'

const { isOnTracUnsupportedResponse } = require('./trackErrors.js')

const TRACKING_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _-]{3,63}$/
const CARRIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,31}$/
const MAX_ITEM_LENGTH = 500

function validate(body) {
  const input = body || {}
  const rawTracking = input.tracking_number
  const rawCarrier = input.carrier

  if (typeof rawTracking !== 'string' || !rawTracking.trim()) {
    return { error: 'tracking_number and carrier are required' }
  }
  if (typeof rawCarrier !== 'string' || !rawCarrier.trim()) {
    return { error: 'tracking_number and carrier are required' }
  }

  const tracking_number = rawTracking.trim()
  const carrier = rawCarrier.trim()

  if (!TRACKING_NUMBER_PATTERN.test(tracking_number)) {
    return { error: 'tracking_number must be 4-64 characters and contain only letters, numbers, spaces, hyphens or underscores' }
  }
  if (!CARRIER_PATTERN.test(carrier)) {
    return { error: 'carrier must be 1-32 characters and contain only letters, numbers, spaces, hyphens or underscores' }
  }

  let item = input.item
  if (item === undefined || item === null || item === '') {
    item = null
  } else if (typeof item !== 'string' || item.length > MAX_ITEM_LENGTH) {
    return { error: `item must be a string of at most ${MAX_ITEM_LENGTH} characters` }
  } else {
    item = item.trim() || null
  }

  return { tracking_number, carrier, item }
}

function sendResult(res, result) {
  const status = Number(result && result.s) || 500

  if (status >= 400) {
    return res.status(status).send({ error: result.msg })
  }

  return res.status(status).send({ msg: result.msg, shipment: result.data })
}

function logError(logger, message, details) {
  if (logger && typeof logger.error === 'function') {
    logger.error(message, details)
  }
}

// Builds the POST /api/track/new handler. `shipment` is injected so the route
// can be tested without a database or a real provider call.
function createTrackNewHandler({ shipment, logger = console } = {}) {
  if (!shipment) throw new Error('shipment handler is required')

  return async function trackNew(req, res) {
    const input = validate(req.body)
    if (input.error) {
      return res.status(400).send({ error: input.error })
    }

    const { tracking_number, carrier, item } = input

    let providerBody
    try {
      providerBody = await shipment.postShippoTrack(tracking_number, carrier)
    } catch (err) {
      logError(logger, 'Tracking provider request failed', {
        tracking_number,
        carrier,
        statusCode: err && (err.statusCode || err.status),
        message: err && err.message
      })

      // Automatic, single-attempt fallback: an explicit OnTrac
      // carrier/tracking limitation becomes a persisted link-only record.
      if (isOnTracUnsupportedResponse(err, carrier)) {
        try {
          const result = await shipment.createLinkOnlyShipment(tracking_number, carrier, item)
          return sendResult(res, result)
        } catch (dbErr) {
          logError(logger, 'Failed to persist link-only tracking entry', {
            tracking_number,
            carrier,
            message: dbErr && dbErr.message
          })
          return res.status(500).send({ error: 'Unable to save tracking entry' })
        }
      }

      return res.status(502).send({ error: 'Unable to create tracking entry with the carrier' })
    }

    try {
      const result = await shipment.createShipment(providerBody, item)
      return sendResult(res, result)
    } catch (dbErr) {
      logError(logger, 'Failed to persist tracking entry', {
        tracking_number,
        carrier,
        message: dbErr && dbErr.message
      })
      return res.status(500).send({ error: 'Unable to save tracking entry' })
    }
  }
}

module.exports = {
  createTrackNewHandler,
  validate
}
