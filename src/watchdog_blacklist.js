const { readBlacklist, blacklistNewAdmin, blacklistIncCounter } = require('./blacklist.js');
const { isAdmin } = require('./helperfunctions.js');
const { bot } = require('./bot.js');
const { cacheGet } = require('./cache.js');

async function watchdogBlacklist() {
    let blacklist = await readBlacklist();
    let me = await cacheGet('bot');
    if (blacklist) {
        blacklist.chats.forEach(async (chat) => {
            if (chat.adm == false) {
                let adm = await isAdmin(me.id, chat.id);
                if (adm) {
                    chat.adm = true;
                    await blacklistNewAdmin(chat.id);
                }
            }
            if (chat.adm == true) {
                blacklist.blacklist.forEach(async (user) => {
                    let isMember = await bot.getChatMember(chat.id, user.id);
                    if (isMember.status == 'member') {
                        await bot.banChatMember(chat.id, user.id);
                        let text = "global_banned <code>" + msg.reply_to_message.from.id + "</code>";
                        await bot.sendMessage()
                        console.log('> BLACKLIST banned user ' + user.id + ' from chat ' + chat.id + ' (blacklist source: ' + user.src + " / marked by:" + user.by + ')');
                        await blacklistIncCounter(chat.id);
                    }
                });
            }
        });
    }
    return;
}

module.exports = { watchdogBlacklist }