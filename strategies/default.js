// this is the sample of strategy format
const TI = require('technicalindicators')
const log = require('../lib/log')

const analyzers = charts => {
  // write your indicators that you will use
  // the result will be merge to the last ticker
  // const { '1m': chart1M, '5m': chart5M } = charts
  return { '1m': {}, '5m': {} }
}

const enter = charts => {
  // write your own strategy here
  // const { '1m': chart1M, '5m': chart5M } = charts
  return { long: false, short: false }
}

module.exports = {
  enter,
  analyzers
}
