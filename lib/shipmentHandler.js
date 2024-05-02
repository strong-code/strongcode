const db = require('./db/db.js')

module.exports = {

  // TODO batch transaction for createOrUpdate() with multiple statuses for shipment in progress

  async createShipment(shipment) {
    const exists = await db.oneOrNone('SELECT * FROM shipments WHERE tracking_number = $1', [shipment.tracking_number])

    if (exists) {
      console.log(`Shipment entry for ${shipment.tracking_number} already exists`)
      return {status: 304, message: `Shipment entry for ${shipment.tracking_number} already exists`}
    } else {
      await db.none(
        'INSERT INTO shipments (tracking_number, carrier, origin, eta) VALUES ($1, $2, $3, $4)',
        [shipment.tracking_number, shipment.carrier, shipment.origin, shipment.eta]
      )

      console.log(`Created entry for shipment ${shipment.tracking_number} (${shipment.carrier})`)

      if (shipment.tracking_history.length > 0) {
        const updates = []

        shipment.tracking_history.forEach(s => {
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
    }

    return {status: 200, message: `Created entry for shipment ${shipment.tracking_number} (${shipment.carrier})`}
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
          SELECT item, status, location, updated_at, shipment_status.tracking_number, carrier, eta, ROW_NUMBER() OVER (
            PARTITION BY shipment_status.tracking_number ORDER BY id DESC
          ) AS row_num FROM shipment_status
        JOIN shipments ON shipments.tracking_number = shipment_status.tracking_number
        WHERE shipments.delivered = false) AS sq WHERE row_num = 1;
      `
    )

    return shipments
  }

}
