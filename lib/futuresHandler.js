const rp = require('request-promise-native')

const SYMBOLS = [
  { name: 'S&P', symbol: 'ES=F' },
  { name: 'Dow', symbol: 'YM=F' },
  { name: 'Nasdaq', symbol: 'NQ=F' }
]

// 60s memory cache: one visitor polling every few minutes shouldn't re-hit Yahoo
let cache = { at: 0, data: null }

function fetchOne(entry) {
  const query = `/v8/finance/chart/${encodeURIComponent(entry.symbol)}?range=1d&interval=5m`
  const attempt = host => rp({
    url: `https://${host}${query}`,
    json: true,
    timeout: 8000,
    headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36' }
  })

  return attempt('query1.finance.yahoo.com')
    .catch(() => attempt('query2.finance.yahoo.com'))
    .then(body => {
      const result = body && body.chart && body.chart.result && body.chart.result[0]
      if (!result || !result.meta || !result.meta.regularMarketPrice) {
        throw new Error(`No chart data for ${entry.symbol}`)
      }
      const closes = (result.indicators.quote[0].close || []).filter(c => c !== null)
      return {
        name: entry.name,
        symbol: entry.symbol,
        price: result.meta.regularMarketPrice,
        previousClose: result.meta.chartPreviousClose,
        points: closes
      }
    })
}

function quotes() {
  if (cache.data && Date.now() - cache.at < 60000) {
    return Promise.resolve(cache.data)
  }
  return Promise.all(SYMBOLS.map(fetchOne))
    .then(data => {
      cache = { at: Date.now(), data }
      return data
    })
}

module.exports = { quotes }
