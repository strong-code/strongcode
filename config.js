const config = {
  development: {
    port: 3000,
    host: 'localhost',
    cors: function(req, res, next) {
      res.header("Access-Control-Allow-Origin", "*")
      next()
    },
    db: {
      user: 'strongcode',
      database: 'strongcode-dev',
      password: 'strongcode',
      host: 'localhost',
      port: 5432,
      max: 10,
      idleTimeoutMillis: 30000
    }
  },

  production: {
    port: 3000,
    host: 'strongco.de',
    cors: function(req, res, next) {
      next()
    },
    db: require('./secrets.js').db
  }
}

exports.init = (env) => {
  if (!env) {
    console.warn('Defaulting to development config')
    env = 'development'
  }

  if (!config[env]) {
    console.warn(`${env} is not a valid config value. Defaulting to development`)
    env = 'development'
  }

  console.log(`Starting server in ${env} environment`)
  return config[env]
}
