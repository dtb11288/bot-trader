const { tail, head, trim, drop, compose } = require('ramda')
const xs = require('xstream').default
const TelegramBot = require('node-telegram-bot-api')
const log = require('../lib/log')

module.exports = ({ token, chat_id: chatId, enable }) => {
  if (!enable) {
    return {
      write: con$ => con$.subscribe({
        next: ({ message }) => log.verbose(message)
      }),
      read: xs.empty()
    }
  }
  const bot = new TelegramBot(token, { polling: true })
  const readCmd$ = xs.create({
    start: listener => {
      return bot.onText(/\/[a-z]+/, (msg, match) => {
        const cmd = compose(drop(1), head)(match)
        const params = tail(match).map(trim)
        log.info(`Received command ${cmd} with params: [${params}]`)
        return listener.next({ cmd, params })
      })
    },
    stop: () => log.info('Telegram stopped')
  })
  return {
    write: con$ => con$.subscribe({
      next: ({ message, options }) => {
        log.verbose(`${message}`)
        return bot.sendMessage(chatId, `${message}`, options)
      }
    }),
    read: readCmd$
  }
}
