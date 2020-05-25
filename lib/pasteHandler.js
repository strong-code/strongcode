module.exports = {

  handleUpload(req, res) {

    const onSuccess = function () {
      console.log('Saved document')
      res.writeHead(200, {'content-type': 'appliaction/json'})
      res.end()
    }

    let buffer = '';

    req.on('data', (data) => {
      buffer += data.toString()
    })

    req.on('end', () => {
      console.log(buffer)
      onSuccess()
    })

    req.on('error', (err) => {
      res.writeHead(500, {'content-type': 'application/json'})
      res.end(JSON.stringify({ message: 'Connection error while uploading paste'}))
    })

  }
}
