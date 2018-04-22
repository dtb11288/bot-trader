const xs = require('xstream').default
const log = require('../lib/log')
const BitMEXClient = require('bitmex-realtime-api')
const qs = require('qs')
const fetch = require('node-fetch')
const {
  compose, over, lensProp, reverse, prop, cond, isEmpty, curry,
  assoc, T, unless
} = require('ramda')
const { propEq, equals, createHeaders, createSignature } = require('../lib/utils')

module.exports = config => {
  const { key, secret, simulate } = config
  const client = new BitMEXClient({
    apiKeyID: key,
    apiKeySecret: secret,
    testnet: simulate,
    maxTableLen: 1
  })

  const baseURL = simulate
    ? 'https://testnet.bitmex.com'
    : 'https://www.bitmex.com'

  const rootAPI = '/api/v1'

  const sendRequest = (method, api, data = {}) => {
    const expires = new Date().getTime() + (60 * 1000)
    const query = method === 'GET' ? `${isEmpty(data) ? '' : '?'}${qs.stringify(data)}` : ''
    const body = method !== 'GET' ? JSON.stringify(data) : ''
    const signature = createSignature(secret, method + rootAPI + api + query + expires + body)
    const headers = createHeaders(expires, key, signature)
    const url = `${baseURL}${rootAPI}${api}${query}`
    const request = unless(
      propEq('method', 'GET'),
      assoc('body', body)
    )({ headers, method })
    log.verbose(`Calling ${method} ${api} with params: ${JSON.stringify(data)}`)

    return fetch(url, request)
      .then(response => response.json().then(data => {
        if ('error' in data) throw new Error(data.error.message)
        const headers = response.headers
        const limit = headers.get('x-ratelimit-limit')
        const remaining = headers.get('x-ratelimit-remaining')
        const reset = headers.get('x-ratelimit-reset')
        return { limit, remaining, reset, data }
      }))
  }

  const client$ = xs.never()
  const sendNext = curry((type, data) => client$.shamefullySendNext({ type, data }))

  // handle bitmex data
  client.on('error', sendNext('error'))
  client.addStream('*', 'announcement', sendNext('announcement'))

  const init = config => () => {
    const { pairs, intervals } = config
    pairs.forEach(pair => {
      client.addStream(pair, 'position', sendNext('position'))

      getOrders(sendRequest, { pair })
        .then(prop('data'))
        .then(orders => {
          sendNext('order', orders)
          client.addStream(pair, 'order', sendNext('order'))
        })

      intervals.forEach(binSize => getHistory(sendRequest, { pair, bin_size: binSize })
        .then(prop('data'))
        .then(history => {
          const tableName = `tradeBin${binSize}`
          const wrapHistory = history => ({ [pair]: { [binSize]: history } })
          sendNext('chart', wrapHistory(history))
          client.addStream(pair, tableName, compose(sendNext('chart'), wrapHistory))
        }))
    })
    return sendNext('config', config)
  }

  const wrapRequest = (fun, type, ...args) => () => fun(sendRequest, ...args)
    .then(sendNext(type))
    .catch(sendNext('error'))

  const execute$ = con$ => con$.subscribe({
    next: ({ cmd, params }) => cond([
      [equals('balance'), wrapRequest(getBalance, 'balance')],
      [equals('open'), wrapRequest(openOrder, 'open', params)],
      [equals('close'), wrapRequest(closeOrder, 'close', params)],
      [equals('config'), init(params)],
      [T, T]
    ])(cmd)
  })

  return {
    write: execute$,
    read: client$
  }
}

const reverseData = over(lensProp('data'), reverse)

const getBalance = sendRequest => {
  const method = 'GET'
  const api = '/user/wallet'
  return sendRequest(method, api)
}

const getOrders = (sendRequest, { pair }) => {
  const method = 'GET'
  const api = '/order'
  const data = { symbol: pair, reverse: true }
  return sendRequest(method, api, data)
    .then(reverseData)
}

const openOrder = (sendRequest, params) => {
  const method = 'POST'
  const api = '/order'
  const {
    pair,
    quantity,
    side,
    price,
    type
  } = params

  return sendRequest(method, api, {
    side,
    symbol: pair,
    orderQty: quantity,
    price,
    ordType: type
  })
}

const closeOrder = (sendRequest, params) => {
  const method = 'PUT'
  const api = '/order'
  return sendRequest(method, api)
}

const getHistory = (sendRequest, { pair, bin_size: binSize }) => {
  const method = 'GET'
  const api = '/trade/bucketed'
  const data = { binSize, symbol: pair, reverse: true, count: 40 }
  return sendRequest(method, api, data)
    .then(reverseData)
}
