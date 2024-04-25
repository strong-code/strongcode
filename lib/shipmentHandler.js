const db = require('./db/db.js')

module.exports = {

  // TODO batch transaction for createOrUpdate() with multiple statuses for shipment in progress

  async createOrUpdate(shipment) {
    const row = await db.oneOrNone('SELECT id FROM shipments WHERE tracking_number = $1', [shipment.tracking_number])

    if (row) {
      await db.none(
        'UPDATE shipments SET status = $1, updated_at = $2 WHERE tracking_number = $3 AND carrier = $4',
        [shipment.status, shipment.updated_at, shipment.tracking_number, shipment.carrier]
      )

      console.log(`Shipment ${shipment.tracking_number} (${shipment.carrier}) has been updated`)
    } else {
      await db.none(
        'INSERT INTO shipments (tracking_number, carrier, eta, updated_at, status) VALUES ($1, $2, $3, $4, $5)',
        [shipment.tracking_number, shipment.carrier, shipment.eta, shipment.updated_at, shipment.status]
      )

      console.log(`Created entry for shipment ${shipment.tracking_number} (${shipment.carrier})`)
    }
  },

  async getLatestStatus(tracking_number) {
    const row = await db.oneOrNone('SELECT * FROM shipments WHERE tracking_number = $1', [tracking_number])

    if (!row) {
      throw Error(`Unable to find shipment with tracking number: ${tracking_number}`)
    } else {
      return row
    }
  },

  async getFullStatus(tracking_number) {
    const rows = await db.manyOrNone('SELECT * FROM shipments WHERE tracking_number = $1 ORDER BY updated_at DESC', [tracking_number])

    if (!rows) {
      throw Error(`Unable to find shipment with tracking number: ${tracking_number}`)
    } else {
      return rows
    }
  }

}
