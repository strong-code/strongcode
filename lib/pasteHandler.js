const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const shell = require('child_process')
const basePath = 'd/' //TODO: this should be taken from config object

module.exports = {

  handleUpload(file) { 
    return set(file)
  },

  handleDelete(key) {
    return get(key).then(path => {
      return remove(basePath + path)
    })
    .then(() => {
      return key
    })
  },

  gallery(limit) {
    let _limit = limit || 10
    
    return getPastes(_limit).then(files => { 
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
  return new Promise((resolve, reject) => {
    getPath(file).then(path => {
      fs.writeFile(path, file.buffer, 'utf8', (err) => {
        if (err) { 
          reject(err)
        } else {
          resolve(path)
        }
      })
    })
  }) 
}

function getPath(file) {
  return new Promise((resolve, reject) => {
    let key = generateKey()
    let ending = path.extname(file.originalname)
    resolve(basePath + key + ending)
  })
}

function generateKey() {
  let length = 3
  return crypto.randomBytes(length).toString('hex')  
} 
