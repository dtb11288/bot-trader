const xs = require('xstream').default
const { map, toPairs, pipe, propOr, identity } = require('ramda')

module.exports = (main, effects) => {
  const sources$ = map(propOr(xs.of(), 'read'), effects)
  const sinks = main(sources$)
  return pipe(
    toPairs,
    map(([key, driver]) => (driver.write || identity)(sinks[key]))
  )(effects)
}
