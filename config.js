const config = {
  development: {
    port: 3000,
    host: 'localhost'
  },

  production: {
    port: 3000,
    host: 'strongco.de'
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

  return config[env]
}
