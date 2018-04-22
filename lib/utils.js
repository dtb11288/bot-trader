const { curry, path } = require('ramda')
const crypto = require('crypto')

const calculateProfit = (open, current, fee) => {
  const profit = current - (fee * 2 * open) - open
  const profitPercent = profit / open * 100
  return { profit, profitPercent }
}

const propEq = curry((pr, expected, actual) => path([pr], actual) === expected)

const equals = curry((actual, expected) => actual === expected)

const createHeaders = (expires, key, signature) => ({
  'content-type': 'application/json',
  'accept': 'application/json',
  'api-expires': expires,
  'api-key': key,
  'api-signature': signature
})

const createSignature = (secret, data) => crypto
  .createHmac('sha256', secret)
  .update(data)
  .digest('hex')

module.exports = {
  calculateProfit,
  propEq,
  equals,
  createHeaders,
  createSignature
}
