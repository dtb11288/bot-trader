const qs = require('qs')
const path = require('path')
const { merge, pipe } = require('ramda')
const { createHeaders, createSignature } = require('../lib/utils')
const { key, secret, simulate } = require('../lib/config')['bitmex']
const fetch = require('node-fetch')
const fs = require('fs')

const baseURL = simulate
  ? 'https://testnet.bitmex.com'
  : 'https://www.bitmex.com'

module.exports = (pair, interval, params = {}) => {
  const expires = new Date().getTime() + (60 * 1000)
  const method = 'GET'
  const api = pipe(
    merge({ reverse: true, binSize: interval, symbol: pair }),
    qs.stringify,
    q => `/api/v1/trade/bucketed?${q}`
  )(params)
  const signature = createSignature(secret, method + api + expires)
  const headers = createHeaders(expires, key, signature)
  const url = `${baseURL}${api}`
  const request = { headers, method }
  return fetch(url, request)
    .then(response => {
      const savingFile = fs.createWriteStream(path.resolve(`./test/data/${pair}-${interval}.json`))
      return response.body.pipe(savingFile)
    })
}
