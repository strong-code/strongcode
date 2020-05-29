const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const basePath = 'd/'

module.exports = {

  handleUpload(req, res) { 
    req.on('error', (err) => {
      res.status(500).send('Error while uploading pasge')
    })

    if (!req.file) {
      res.status(500).send('No file attached to POST')
    }

    save(req.file, (path) => {
      if (!path) {
        res.status(500).send('Error while saving paste')
      }
      let url = req.headers.host + '/' + path
      res.status(200).send(url)
    })
  }

}

function save(file, cb) {
  let path = getPath(file)

  fs.writeFile(path, file.buffer, 'utf8', (err) => {
    if (err) { 
      console.log(err)
      return cb()
    }
    return cb(path)
  }) 
}

function getPath(file) {
  let key = generateKey()
  let ending = path.extname(file.originalname)
  return basePath + key + ending
}

function generateKey() {
  let length = 3
  return crypto.randomBytes(length).toString('hex')  
} 
