const fileStore = require('./file_store.js')

module.exports = {

  handleUpload(req, res) {
    let buffer = '';

    req.on('data', (data) => {
      buffer += data.toString()
    })

    req.on('end', () => {
      fileStore.set(buffer, '.txt', (path) => {
        let fp = req.headers.host + path.substr(1)
        res.send(fp)
      })
    })

    req.on('error', (err) => {
      res.writeHead(500, {'content-type': 'application/json'})
      res.end(JSON.stringify({ message: 'Error while uploading paste'}))
    })

  }

}
