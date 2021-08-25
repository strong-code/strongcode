const config = require('./config.js').init(process.argv[2])
const express = require('express')
const bodyParser = require('body-parser')
const app = express()

// Handler modules
const paste = require('./lib/pasteHandler.js')
const url = require('./lib/urlHandler.js')

// Multer middleware for form uploads
// TODO: get from config
const m = require('multer')
const storage = m.memoryStorage()
const upload = m({ storage: storage })

// Statically hosted directories
// TODO: get from config
app.use('/d', express.static('d'))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

// Use CORS middleware in dev environment, empty next() call in prod
app.use(config.cors)

app.get('/', (req, res) => {
  res.send(req.hostname)
})

app.get('/api/health', (req, res) => {
  paste.stats()
  .then(v => {
    const data = Object.assign(...v)
    res.status(200).send(data)
  })
  .catch(e => {
    res.status(500).send({ error: e })
  })
})

/*
 PASTE ROUTES
*/
app.post('/api/paste', upload.single('file'), (req, res) => {
  let save

  if (!req.file && req.body) {
    save = paste.saveText(req.body.text)
  } else {
    save = paste.saveFile(req.file)
  }
  
  return save.then(path => {
    let fp = `${req.protocol}://${req.headers.host}/${path}`
    res.status(200).send({ path: fp })
  })
  .catch(e => {
    res.status(500).send({ error: e })
  })
})

app.delete('/api/paste/:key', (req, res) => {
  paste.handleDelete(req.params.key)
  .then(data => {
    res.status(200).send({ deleted: true, key: req.params.key })
  })
  .catch(e => {
    res.status(500).send({ error: e })
  })
})

app.get('/api/pastes', (req, res) => {
  paste.gallery(req.params.limit)
  .then(data => {
    res.status(200).send({ pastes: data })
  })
  .catch(e => {
    res.status(500).send({ error: e })
  })
})

/*
 SHORTENING ROUTES
*/
app.post('/api/shorten', (req, res) => {
  url.shorten(req.body.url)
  .then(key => {
    res.status(200).send({ url: `${config.host}/u/${key}` })
  })
  .catch(e => {
    res.status(500).send({ error: e })
  })
})

app.get('/u/:key', (req, res) => {
  url.findByKey(req.params.key)
  .then(data => {
    res.status(301).redirect(data.long_url)
  })
  .catch(e => {
    res.status(500).send({ error: e })
  })
})

app.listen(config.port, 'localhost', () => {
  console.log(`App started on port ${config.port}`)
})

