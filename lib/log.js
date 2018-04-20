const winston = require('winston')
const logLevel = require('./config.js')['log']['level'] || 'debug'

winston.level = logLevel
winston.addColors({
  silly: 'magenta',
  debug: 'blue',
  verbose: 'cyan',
  info: 'green',
  warn: 'yellow',
  error: 'red'
})
winston.remove(winston.transports.Console)
winston.add(winston.transports.Console, {
  level: logLevel,
  prettyPrint: true,
  colorize: 'all',
  silent: false,
  timestamp: true
})

winston.info('Logger\'s inited')

module.exports = winston
