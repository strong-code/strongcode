const rp = require('request-promise-native')

const SYMBOLS = [
  { name: 'S&P', symbol: 'ES=F' },
  { name: 'Dow', symbol: 'YM=F' },
  { name: 'Nasdaq', symbol: 'NQ=F' }
]

// 60s memory cache: one visitor polling every few minutes shouldn't re-hit Yahoo
let cache = { at: 0, data: null }

// Full browser-like header set required: Yahoo's edge returns 429 for bare requests
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'application/json,text/plain,*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://finance.yahoo.com/',
  'Origin': 'https://finance.yahoo.com'
}

function fetchOne(entry) {
  // ponytail: 1d intermittently returns near-empty bar sets during Globex opens;
  // 2d + trailing 24h window approximates the current session (two-session bleed
  // possible late in a trade date - switch to real CME session boundaries if it matters)
  const query = `/v8/finance/chart/${encodeURIComponent(entry.symbol)}?range=2d&interval=5m`
  const attempt = host => rp({
    url: `https://${host}${query}`,
    json: true,
    timeout: 8000,
    headers: BROWSER_HEADERS
  })

  return attempt('query1.finance.yahoo.com')
    .catch(() => attempt('query2.finance.yahoo.com'))
    .then(body => {
      const result = body && body.chart && body.chart.result && body.chart.result[0]
      if (!result || !result.meta || !result.meta.regularMarketPrice) {
        throw new Error(`No chart data for ${entry.symbol}`)
      }
      const rawTimes = result.timestamp || []
      const rawCloses = result.indicators.quote[0].close || []
      const cutoff = (rawTimes.length ? rawTimes[rawTimes.length - 1] : 0) - 24 * 3600
      const times = []
      const closes = []
      for (let i = 0; i < rawCloses.length && i < rawTimes.length; i++) {
        if (rawTimes[i] >= cutoff && rawCloses[i] !== null && rawCloses[i] !== undefined) {
          closes.push(rawCloses[i])
          times.push(rawTimes[i])
        }
      }
      return {
        name: entry.name,
        symbol: entry.symbol,
        price: result.meta.regularMarketPrice,
        previousClose: result.meta.chartPreviousClose,
        points: closes,
        times: times
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
