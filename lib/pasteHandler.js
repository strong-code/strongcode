const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const shell = require('child_process')
const request = require('request').defaults({ encoding: null })
const basePath = 'd/' //TODO: this should be taken from config object
const rehostableMIMES = ['.png', '.jpg', '.jpeg', '.gif', '.webm']

module.exports = {

  saveFile(file) {
    return  getPath(file.originalname).then(path => {
      return set(file.buffer, path, 'base64')
    })
  },

  saveText(data) {
    data = data.toString()

    if (validURL(data) && rehostable(data)) { 
      return getRemoteFile(data).then(b => {
        return module.exports.saveFile({
          buffer: b,
          originalname: 'i' + path.extname(data) 
        })
      })
    }

    return getPath('x.txt').then(path => {
      return set(data, path)
    })
  },

  handleDelete(key) {
    return get(key).then(path => {
      return remove(basePath + path)
    })
    .then(() => {
      return key
    })
  },

  gallery(limit, idx) {
    let _limit = limit || 10
    let _idx = idx || 1
    
    return getPastes(_limit, _idx).then(files => { 
      return files.split(/\n/)
    })
  },

  stats() {
    return Promise.all([folderSize(), numberOfPastes()])
  }

}

function folderSize() {
  const dirPath = path.join(__dirname, '../d')

  return new Promise((resolve, reject) => {
    shell.exec(`du -h ${dirPath}`, (err, stdout, stderr) => {
      if (err) { return reject(err) }
      if (stderr) { return reject(stderr) }
      return resolve({folderSize: stdout.split('\t')[0]})
    })
  })
}

function numberOfPastes() {
  const dirPath = path.join(__dirname, '../d')

  return new Promise((resolve, reject) => {
    shell.exec(`ls -l ${dirPath} | wc -l`, (err, stdout, stderr) => {
      if (err) { return reject(err) }
      if (stderr) { return reject(stderr) }
      return resolve({totalPastes: stdout.trim()})
    })
  })
}

function rehostable(url) {
  return rehostableMIMES.indexOf(path.extname(url)) > -1
}

function getRemoteFile(url) {
  return new Promise((resolve, reject) => {
    request.get(url, (e, res) => {
      if (e) { return reject(e) }
      return resolve(res.body)
    })
  })
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

function getPastes(limit, idx) {
  if (idx <= 0) {
    idx = 1
  }

  let total = limit * idx 
  let cmd = `ls ${basePath} -tA1 | head -${total}`

  if (idx) {
    cmd += ` | tail -${limit}`
  }

  return new Promise((resolve, reject) => {
    shell.exec(cmd, (err, stdout, stderr) => {
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

function set(data, path, encoding) {
  encoding = encoding || 'utf8'

  return new Promise((resolve, reject) => {
    fs.writeFile(path, data, encoding, (err) => {
      if (err) { 
        reject(err)
      } else {
        resolve(path)
      }
    })
  }) 
}

function getPath(filename) {
  return new Promise((resolve, reject) => {
    let key = generateKey()
    let ending = path.extname(filename)
    resolve(basePath + key + ending)
  })
}

function generateKey() {
  return crypto.randomBytes(3).toString('hex')  
} 

function validURL(str) {
  const pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
    '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
  return !!pattern.test(str);
}
