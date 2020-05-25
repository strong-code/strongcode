const express = require('express')
const app = express()
const port = 3000
const paste = require('./lib/pasteHandler.js')

app.post('/paste', (req, res) => {
  return paste.handleUpload(req, res)
})

app.route('/paste/:paste_id')
  .get((req, res) => {
    // get
  })
  .delete((req, res) => {
    // delete
  })

app.get('/', (req, res) => {
  res.send(req.hostname)
})

app.listen(port, () => {
  console.log(`App started on port ${port}`)
})
