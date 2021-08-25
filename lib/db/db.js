const pgp = require('pg-promise')();
const config = require('../../config.js').init(process.argv[2])
const db = pgp(config.db)

module.exports = db
