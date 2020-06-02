const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const shell = require('child_process')
const basePath = 'd/' //TODO: this should be taken from config object

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
        return res.status(500).send({ error: 'Error while saving paste' })
      }
      let url = req.headers.host + '/' + path
      return res.status(200).send({ url: url })
    })
  },

  handleDelete(req, res) {
    let key = req.params.key

    req.on('error', (err) => {
      return res.status(500).send({ error: `Error deleting paste ${key}` })
    })

    get(key)
    .then(path => {
      return remove(basePath + path)
    })
    .then(() => {
      res.status(200).send({ key: key })
    })
    .catch(err => {
      res.status(500).send({ error: err })
    })
  },

  //TODO: should all router funcs hand res obj on their own like this?
  gallery(req, res) {
    let limit = req.params.limit || 10
    return getPastes(limit).then(files => { 
      return files.split(/\n/)
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

function getPastes(limit) {
  return new Promise((resolve, reject) => {
    shell.exec(`ls ${basePath} -tA1 | head -${limit}`, (err, stdout, stderr) => {
      if (err) { return reject(err) }
      if (stderr) { return reject(stderr) }
      resolve(stdout.trim())
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
