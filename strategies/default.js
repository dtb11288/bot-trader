// this is the sample of strategy format
const TI = require('technicalindicators')
const log = require('../lib/log')

const getAnalyzers = charts => {
  // write your indicators that you will use
  // const { '1m': chart1M, '5m': chart5M } = charts
  return { '1m': {}, '5m': {} }
}

const getBuyPoint = charts => {
  // write your own strategy here
  // const { '1m': chart1M, '5m': chart5M } = charts
  return { long: false, short: false }
}

module.exports = {
  getBuyPoint,
  getAnalyzers
}
