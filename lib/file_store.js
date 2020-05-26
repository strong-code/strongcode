const crypto = require('crypto')
const fs = require('fs')
const basePath = './d'

function generateKey(keyLength) {
  let length = keyLength || 3
  return crypto.randomBytes(length).toString('hex')
}

module.exports = {

  set(data, mime, cb) {
    let key = generateKey()
    let filepath = basePath + '/' + key + mime
      
    fs.writeFile(filepath, data, 'utf8', (err) => {
      if (err) {
        console.log('Error creating file at ' + filepath)
        return cb()
      } else {
        return cb(filepath)
      }
    })
  }
 
}
