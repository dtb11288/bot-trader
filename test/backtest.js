// const download = require('./download')
// download('XBTUSD', '1m', { count: 500 })
// download('XBTUSD', '5m', { count: 500 })

const { strategy } = require('../lib/config')['bot']
const { getAnalyzers, getBuyPoint } = require('../lib/strategy')(strategy)
const { reverse, pipe, filter, prop, tryCatch, always } = require('ramda')
const charts = {
  '1m': reverse(require('./data/XBTUSD-1m.json'))
  // '5m': reverse(require('./data/XBTUSD-5m.json'))
}

const result = pipe(
  tryCatch(getAnalyzers, always({})),
  tryCatch(getBuyPoint, always({})),
  filter(prop('long'))
)(charts)

console.log(result)
