const xs = require('xstream').default
const { propEq } = require('./utils')
const {
  curry, merge, over, lensIndex, map, concat, keys, lensProp, __,
  prop, assoc, dissoc, pipe, mergeWith, head, fromPairs, defaultTo,
  compose
} = require('ramda')

module.exports = curry((config, sources) => {
  // telegram messages
  const options = {
    'reply_markup': { 'keyboard': [
      ['/balance'],
      ['/currency'],
      ['/start']
    ] }
  }

  const errorMessage$ = sources.BITMEX
    .filter(propEq('type', 'error'))
    .map(({ data }) => ({ message: `Error: ${data.message}`, options }))

  const startMessage$ = sources.TELEGRAM
    .filter(propEq('cmd', 'start'))
    .mapTo({ message: 'Bot is running...', options })

  const balanceMessage$ = sources.BITMEX
    .filter(propEq('type', 'balance'))
    .map(({ data: message }) => ({ message: JSON.stringify(message), options }))

  const currency$ = sources.BITMEX
    .filter(propEq('order'))
  const currencyMessage$ = xs.merge(
    currency$,
    sources.TELEGRAM.filter(propEq('cmd', 'currency'))
  )
    .fold((store, { cmd, data }) => {
      if (cmd && store.price) return assoc('message', `Currency price: ${JSON.stringify(store.price)}`, store)
      return pipe(
        assoc('price', data.price),
        dissoc('message')
      )(store)
    }, { options })
    .filter(prop('message'))

  const announcementMessage$ = sources.BITMEX
    .filter(propEq('type', 'announcement'))
    .map(prop('data'))
    .map(message => ({ message, options }))

  const telegram$ = xs.merge(
    errorMessage$,
    startMessage$,
    balanceMessage$,
    currencyMessage$,
    balanceMessage$,
    announcementMessage$
  )

  // bitmex commands
  const { analyzers: getAnalyzers, enter } = require('./strategy')(config.strategy)
  const initCommand$ = xs.of({ cmd: 'config', params: config })
  const config$ = sources.BITMEX
    .filter(propEq('type', 'config'))
    .map(prop('data'))

  const balanceCommand$ = sources.TELEGRAM
    .filter(propEq('cmd', 'balance'))
    .mapTo({ cmd: 'balance' })

  // { '1m': [], '5m': [] }
  const defaultCharts = pipe(
    map(interval => [interval, []]),
    fromPairs,
    defaultTo
  )(config.intervals)

  const handleTicker = (charts, ticker) => {
    const pair = keys(ticker)[0]
    return over(lensProp(pair), pipe(
      defaultCharts,
      mergeWith(concat, __, ticker[pair]),
      charts => {
        const analyzers = getAnalyzers(charts)
        const mergeAnalyzer = (chart, analyzer) => {
          const updateLast = over(lensIndex(chart.length - 1))
          return updateLast(merge(analyzer), chart)
        }
        return mergeWith(mergeAnalyzer, charts, analyzers)
      }
    ), charts)
  }

  const chart$ = sources.BITMEX
    .filter(propEq('type', 'chart'))
    .map(prop('data'))
    .fold(handleTicker, {})
    .drop(1) // drop first empty

  const price$ = xs.of()

  const open$ = xs.combine(
    config$,
    chart$.map(map(compose(enter, defaultCharts))).drop(1) // drop first check
  )

  const openCommand$ = xs.merge(open$, price$)

  const order$ = sources.BITMEX
    .filter(propEq('type', 'order'))
    .map(prop('data'))

  const closeCommand$ = xs.combine(
    config$,
    order$
      .drop(1)
      .map(head)
      .filter(propEq('ordStatus', 'Filled'))
  )
    .map(([config, order]) => ({
      cmd: 'close',
      params: {
        id: order.orderID,
        quantity: order.orderQty,
        price: order.price,
        profit: config.profit
      }
    }))

  const bitmex$ = xs.merge(
    initCommand$,
    balanceCommand$,
    openCommand$,
    closeCommand$
  )

  return {
    TELEGRAM: telegram$,
    BITMEX: bitmex$
  }
})
