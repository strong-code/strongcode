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
app.use(bodyParser.urlencoded({ extended: true, limit: '2mb' }))
app.use(bodyParser.json({ limit: '2mb' }))

// Use CORS middleware in dev environment, empty next() call in prod
app.use(config.cors)

/*
 MISC ROUTES
*/
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

app.get('/ip', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
  res.status(200).send(ip)
})

/*
 PASTE ROUTES
*/
app.post('/api/paste', upload.single('file'), (req, res) => {
  let save

  if (req.file || req.body.file) {
    const file = req.file || req.body.file
    save = paste.saveFile(file)
  } else {
    save = paste.saveText(req.body.text)
  }
  
  return save.then(path => {
    let fp = `${config.host}/${path}`
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
  paste.gallery(req.query.limit, req.query.batch)
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
    if (e.name == "QueryResultError") {
      res.status(404).send("(○´ ― `)ゞ I couldn't find that URL...")
    } else {
      res.status(500).send({ error: e })
    }
  })
})

/*
 404 CATCH-ALL
*/
app.get('*', (req, res) => {
  res.status(404).send("(○´ ― `)ゞ I couldn't find that resource...")
})

app.listen(config.port, 'localhost', () => {
  console.log(`App started on port ${config.port}`)
})

