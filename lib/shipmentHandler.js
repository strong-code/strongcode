const db = require('./db/db.js')
const request = require('request-promise-native')
const secrets = require('./../secrets.js')

module.exports = {

  // TODO batch transaction for createOrUpdate() with multiple statuses for shipment in progress

  async createShipment(shipment, item) {
    const exists = await db.oneOrNone('SELECT * FROM shipments WHERE tracking_number = $1', [shipment.tracking_number])

    if (exists) {
      if (exists.delivered) {
        const deliveredAt = exists.delivered_at ? ` (delivered ${new Date(exists.delivered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})` : ''
        console.log(`Shipment entry for ${shipment.tracking_number} already exists and is delivered`)
        return { s: 409, msg: `Tracking number ${shipment.tracking_number} was already delivered${deliveredAt}. It is in the deliveries list, not the active shipments.` }
      }

      await db.none(
        'UPDATE shipments SET archived = false, eta = $2 WHERE tracking_number = $1',
        [shipment.tracking_number, shipment.eta]
      )
      console.log(`Re-added existing shipment ${shipment.tracking_number} to active tracking`)

      const row = await db.oneOrNone(
        `
          SELECT s.tracking_number, s.carrier, s.eta, s.item, s.delivered, s.delivered_at,
                 st.status, st.location, st.updated_at
          FROM shipments s
          LEFT JOIN shipment_status st ON st.tracking_number = s.tracking_number
          WHERE s.tracking_number = $1
          ORDER BY st.id DESC LIMIT 1
        `,
        [shipment.tracking_number]
      )

      return {
        s: 201,
        msg: `Re-added existing shipment ${shipment.tracking_number} to active tracking`,
        data: {
          tracking_number: row.tracking_number,
          carrier: row.carrier,
          item: row.item,
          eta: row.eta,
          status: row.status,
          location: row.location,
          delivered: row.delivered,
          delivered_at: row.delivered_at,
          updated_at: row.updated_at
        }
      }
    }

    const latest = shipment.tracking_status
    const delivered = !!(latest && latest.status === 'DELIVERED')
    const deliveredAt = delivered ? new Date().toISOString() : null

    await db.none(
      'INSERT INTO shipments (tracking_number, carrier, origin, eta, item, delivered, delivered_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [shipment.tracking_number, shipment.carrier, shipment.origin, shipment.eta, item || null, delivered, deliveredAt]
    )

    console.log(`Created entry for shipment ${shipment.tracking_number} (${shipment.carrier})`)

    const history = shipment.tracking_history || []

    if (history.length > 0) {
      const updates = []

      history.forEach(s => {
        const location = (s.location ? s.location.city + ', ' + s.location.state : 'Unknown')

        updates.push(module.exports.updateStatus(
          {
            tracking_number: shipment.tracking_number,
            status: s.status_details,
            location: location,
            updated_at: new Date().toISOString()
          }
        ))
      })

      await Promise.all(updates)
      console.log(`Adding ${updates.length} previous tracking statuses for ${shipment.tracking_number} (${shipment.carrier})`)
    }

    return {
      s: 201,
      msg: `Created entry for shipment ${shipment.tracking_number} (${shipment.carrier})`,
      data: {
        tracking_number: shipment.tracking_number,
        carrier: shipment.carrier,
        item: item || null,
        eta: shipment.eta,
        status: latest ? latest.status_details : null,
        location: (latest && latest.location ? latest.location.city + ', ' + latest.location.state : null),
        delivered: delivered,
        delivered_at: deliveredAt,
        updated_at: new Date().toISOString()
      }
    }
  },

  async updateStatus(update) {
    await db.none(
      'INSERT INTO shipment_status (tracking_number, status, location, updated_at) VALUES ($1, $2, $3, $4)',
      [update.tracking_number, update.status, update.location, update.updated_at]
    )

    console.log(`Updated ${update.tracking_number} status`)
  },

  async getLatestStatus(tracking_number) {
    const row = await db.oneOrNone(
      `
        SELECT shipments.item, shipments.eta, shipment_status.* FROM shipment_status
        JOIN shipments ON shipments.tracking_number = shipment_status.tracking_number
        WHERE shipments.tracking_number = $1
        ORDER BY id DESC LIMIT 1;
      `,
      [tracking_number]
    )

    if (!row) {
      if (await db.one('SELECT * FROM shipments WHERE tracking_number = $1', [tracking_number])) {
        return { data: 'Label created. Item has not yet shipped' }
      } else {
        throw Error(`Unable to find shipment with tracking number: ${tracking_number}`)
      }
    } else {
      return row
    }
  },

  async getFullStatus(tracking_number) {
    const rows = await db.manyOrNone(
      `
        SELECT shipments.item, shipment_status.* FROM shipment_status
        JOIN shipments ON shipments.tracking_number = shipment_status.tracking_number
        WHERE shipments.tracking_number = $1
        ORDER BY id DESC;
      `,
      [tracking_number]
    )

    if (!rows) {
      throw Error(`Unable to find shipment with tracking number: ${tracking_number}`)
    } else {
      return rows
    }
  },

  async markDelivered(tracking_number) {
    await db.none(
      'UPDATE shipments SET delivered = true, delivered_at = COALESCE(delivered_at, NOW()) WHERE tracking_number = $1',
      [tracking_number]
    )

    console.log(`Shipment ${tracking_number} marked as delivered`)
  },

  async getAllActive() {
    // Delivered shipments are kept visible for 24 hours, then moved to history automatically.
    await db.none(
      `
        UPDATE shipments SET archived = true
        WHERE delivered = true AND (delivered_at IS NULL OR delivered_at < NOW() - INTERVAL '24 hours')
      `
    )

    const shipments = await db.manyOrNone(
      `
        SELECT * FROM (
          SELECT item, status, location, updated_at, shipments.tracking_number, carrier, eta, delivered, delivered_at, ROW_NUMBER() OVER (
            PARTITION BY shipments.tracking_number ORDER BY id DESC
          ) AS row_num FROM shipments
        LEFT JOIN shipment_status ON shipments.tracking_number = shipment_status.tracking_number
        WHERE shipments.archived = false
          AND (COALESCE(shipments.delivered, false) = false
            OR (shipments.delivered = true AND shipments.delivered_at >= NOW() - INTERVAL '24 hours'))
        ) AS sq WHERE row_num = 1
        ORDER BY eta ASC NULLS LAST, updated_at DESC;
      `
    )

    return shipments
  },

  async getRecentDelivered(limit) {
    return await db.manyOrNone(
      `
        SELECT tracking_number, carrier, item, delivered_at FROM shipments
        WHERE delivered = true
        ORDER BY delivered_at DESC NULLS LAST
        LIMIT $1;
      `,
      [limit]
    )
  },

  async setItem(tracking_number, item) {
    const result = await db.result(
      'UPDATE shipments SET item = $1 WHERE tracking_number = $2',
      [item, tracking_number]
    )

    return result.rowCount > 0
  },

  async setArchived(tracking_number, archived) {
    const result = await db.result(
      'UPDATE shipments SET archived = $1 WHERE tracking_number = $2',
      [archived, tracking_number]
    )

    return result.rowCount > 0
  },

  async removeShipment(tracking_number) {
    return await db.tx(async t => {
      await t.none('DELETE FROM shipment_status WHERE tracking_number = $1', [tracking_number])
      const result = await t.result('DELETE FROM shipments WHERE tracking_number = $1', [tracking_number])
      return result.rowCount > 0
    })
  },

  async postShippoTrack(trackingNumber, carrier) {
    const opts = {
      method: 'POST',
      uri: 'https://api.goshippo.com/tracks/',
      body: {
        'tracking_number': trackingNumber,
        'carrier': carrier
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': secrets.shippo.prod_token
      },
      json: true
    }

    const body = await request(opts)
    body.origin = (body.address_from ? body.address_from.city + ', ' + body.address_from.state : 'unknown')
    return body
  }

}
