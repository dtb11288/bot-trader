const path = require('path')
const { over, lensProp, merge } = require('ramda')
const {
  c: configPath = 'config.json',
  s: strategy = 'default'
} = require('minimist')(process.argv.slice(2))

const configFullPath = path.resolve(`${configPath}`)
const config = require(configFullPath)

module.exports = over(lensProp('bot'), merge({ strategy, config_path: configFullPath }), config)
