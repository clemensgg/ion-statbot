import config from '../config.js'
import TelegramBot from 'node-telegram-bot-api';
const bot = new TelegramBot(config.tgBotToken, { polling: true });

bot.setWebHook(config.appEndpoint, {
    certificate: config.sslcert,
});

const tgOptions = {
    "disable_web_page_preview": true,
    "parse_mode": "HTML"
}

export {
    bot,
    tgOptions
}