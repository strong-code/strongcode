const config = require('./config.js').init(process.argv[2])
const express = require('express')
const app = express()
app.set('view engine', 'pug')

// Handler modules
const paste = require('./lib/pasteHandler.js')

// Multer middleware for form uploads
// TODO: get from config
const m = require('multer')
const storage = m.memoryStorage()
const upload = m({ storage: storage })

// Statically hosted directories
// TODO: get from config
app.use('/d', express.static('d'))

/*
  WEB ROUTES
*/
app.get('/', (req, res) => {
  res.send(req.hostname)
})

app.get('/pastes', (req, res) => {
  paste.gallery(req, res)
  .then(data => {
    res.render('gallery', { pastes: data })
  })
})

/*
  API ROUTES
*/
app.post('/api/paste', upload.single('file'), (req, res) => {
  return paste.handleUpload(req, res)
})

app.delete('/api/paste/:key', (req, res) => {
  return paste.handleDelete(req, res)
})

app.get('/api/pastes', (req, res) => {
  return paste.gallery(req, res)
})

app.listen(config.port, () => {
  console.log(`App started on port ${config.port}`)
})
