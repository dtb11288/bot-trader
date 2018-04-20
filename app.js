const run = require('./lib/run')
const config = require('./lib/config.js')
const makeTelegramDriver = require('./drivers/telegram')
const makeBitMEXDriver = require('./drivers/bitmex')
const trader = require('./lib/trader')

const main = trader(config.bot)
const drivers = {
  TELEGRAM: makeTelegramDriver(config.telegram),
  BITMEX: makeBitMEXDriver(config.bitmex)
}

run(main, drivers)
