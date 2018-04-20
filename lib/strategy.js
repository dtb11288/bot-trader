const { map, pipe } = require('ramda')
const path = require('path')
const log = require('./log')

module.exports = strategy => {
  log.warn(`Using strategy: ${strategy}`)
  const strategyPath = path.resolve(`./strategies/${strategy}`)
  const wrapErrorCheck = fun => charts => {
    try {
      return fun(charts)
    } catch (error) {
      log.error(`Strategy error: ${error.message}`)
      return {}
    }
  }
  return pipe(
    require,
    map(wrapErrorCheck)
  )(strategyPath)
}
