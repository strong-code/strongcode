const crypto = require('crypto')
const db = require('./db/db.js')

module.exports = {

  async shorten(urls) {
    const keys = []

    urls.forEach(u => {
      keys.push(createShortUrl(u))
    })

    return await Promise.all(keys)
  },

  async findByKey(key) {
    return await db.one('SELECT long_url FROM urls WHERE key = $1', [key])
  }

}

async function createShortUrl(longUrl) {
  const row = await db.oneOrNone('SELECT key FROM urls WHERE long_url = $1', [longUrl]) 

  if (row) {
    return { longUrl: longUrl, key: row.key }
  } else {
    const key = newKey()
    await db.none(
      'INSERT INTO urls (key, long_url, created_at) VALUES ($1, $2, $3)', 
      [key, longUrl, new Date().toISOString()]
    )
    return { longUrl: longUrl, key: key }
  }
}

function byUrl(longUrl) {
  return db.one('SELECT * FROM urls WHERE long_url = $1', [longUrl])
    .then(row => {
      return true
    })
    .catch(e => {
      return false
    })
}

function newKey() {
  return crypto.randomBytes(3).toString('hex')  
}
