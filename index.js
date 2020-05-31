const express = require('express')
const app = express()
const port = 3000
const paste = require('./lib/pasteHandler.js')

// Multer middleware for form uploads
const m = require('multer')
const storage = m.memoryStorage()
const upload = m({ storage: storage })

// Statically host pastes in /d
app.use('/d', express.static('d'))

app.post('/paste', upload.single('file'), (req, res) => {
  return paste.handleUpload(req, res)
})

app.delete('/paste/:key', (req, res) => {
  return paste.handleDelete(req, res)
})

app.get('/', (req, res) => {
  res.send(req.hostname)
})

app.listen(port, () => {
  console.log(`App started on port ${port}`)
})
