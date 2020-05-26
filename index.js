const express = require('express')
const app = express()
const port = 3000
const paste = require('./lib/pasteHandler.js')

// Statically host pastes in /d
app.use('/d', express.static('d'))

app.post('/paste', (req, res) => {
  return paste.handleUpload(req, res)
})

app.delete('/paste/:key', (req, res) => {
  // delete
})

app.get('/', (req, res) => {
  res.send(req.hostname)
})

app.listen(port, () => {
  console.log(`App started on port ${port}`)
})
