const { curry, path } = require('ramda')

const calculateProfit = (open, current, fee) => {
  const profit = current - (fee * 2 * open) - open
  const profitPercent = profit / open * 100
  return { profit, profitPercent }
}

const propEq = curry((pr, expected, actual) => path([pr], actual) === expected)

const equals = curry((actual, expected) => actual === expected)

module.exports = {
  calculateProfit,
  propEq,
  equals
}
