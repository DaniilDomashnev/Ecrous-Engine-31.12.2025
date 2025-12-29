const tg = window.Telegram.WebApp

tg.ready()
tg.expand() // на весь экран
tg.disableVerticalSwipes()

console.log('Telegram WebApp запущен')
