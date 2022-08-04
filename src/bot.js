const config = require('../config.json');
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(config.tgBotToken, { polling: true });

bot.setWebHook(config.appEndpoint, {
    certificate: config.sslcert,
});

const tgOptions = {
    "disable_web_page_preview": true,
    "parse_mode": "HTML"
}

module.exports = {
    bot,
    tgOptions
}