const db = require('./db/db.js')
const request = require('request-promise-native')
const secrets = require('./../secrets.js')

module.exports = {

  // TODO batch transaction for createOrUpdate() with multiple statuses for shipment in progress

  async createShipment(shipment, item) {
    const exists = await db.oneOrNone('SELECT * FROM shipments WHERE tracking_number = $1', [shipment.tracking_number])

    if (exists) {
      console.log(`Shipment entry for ${shipment.tracking_number} already exists`)
      return {s: 409, msg: `Shipment entry for ${shipment.tracking_number} already exists`}
    }

    const latest = shipment.tracking_status
    const delivered = (latest && latest.status === 'DELIVERED')

    await db.none(
      'INSERT INTO shipments (tracking_number, carrier, origin, eta, item, delivered) VALUES ($1, $2, $3, $4, $5, $6)',
      [shipment.tracking_number, shipment.carrier, shipment.origin, shipment.eta, item || null, delivered]
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
      'UPDATE shipments SET delivered = true WHERE tracking_number = $1',
      [tracking_number]
    )

    console.log(`Shipment ${tracking_number} marked as delivered`)
  },

  async getAllActive() {
    const shipments = await db.manyOrNone(
      `
        SELECT * FROM (
          SELECT item, status, location, updated_at, shipments.tracking_number, carrier, eta, ROW_NUMBER() OVER (
            PARTITION BY shipments.tracking_number ORDER BY id DESC
          ) AS row_num FROM shipments
        LEFT JOIN shipment_status ON shipments.tracking_number = shipment_status.tracking_number
        WHERE shipments.delivered = false AND shipments.archived = false) AS sq WHERE row_num = 1
        ORDER BY eta ASC NULLS LAST, updated_at DESC;
      `
    )

    return shipments
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
