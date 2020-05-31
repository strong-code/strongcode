const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const basePath = 'd/'

module.exports = {

  handleUpload(req, res) { 
    req.on('error', (err) => {
      return res.status(500).send('Error while uploading pasge')
    })

    if (!req.file) {
      return res.status(500).send('No file attached to POST')
    }

    set(req.file, (path) => {
      if (!path) {
        return res.status(500).send('Error while saving paste')
      }
      let url = req.headers.host + '/' + path
      return res.status(200).send({ success: true, url: url })
    })
  },

  handleDelete(req, res) {
    let key = req.params.key

    req.on('error', (err) => {
      return res.status(500).send({ success: false, error: `Error deleting paste ${key}` })
    })

    get(key)
    .then(path => {
      return remove(basePath + path)
    })
    .then(() => {
      res.status(200).send({ success: true, key: key })
    })
    .catch(err => {
      console.log(err)
      res.status(500).send({ success: false, error: err })
    })
  }

}

function get(key) {
  return new Promise((resolve, reject) => {
    listDir().then(files => {
      files.forEach(f => {
        if (f.indexOf(key) > -1) { 
          return resolve(f) 
        }
      })
      reject(`No paste found for key ${key}`)
    })
  })
}

function listDir() {
  return new Promise((resolve, reject) => {
    fs.readdir(basePath, (err, files) => {
      if (err) { 
        reject(err)
      } else {
        resolve(files)
      }
    })
  })
}

function remove(path) {
  return new Promise((resolve, reject) => {
    fs.unlink(path, (err) => {
      if (err) { 
        reject(err) 
      } else {
        resolve()
      }
    })
  })
}

function set(file, cb) {
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
