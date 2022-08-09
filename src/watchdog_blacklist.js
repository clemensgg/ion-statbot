import config from '../config.js'
import { fsReadBlacklist, blacklistNewAdmin, blacklistCounter } from './blacklist.js';
import { isAdmin } from './helperfunctions.js';
import { bot, tgOptions } from './bot.js';
import { cacheGet } from './cache.js';

async function watchdogBlacklist() {
    let blacklist = await fsReadBlacklist();
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
            if (chat.adm == true && chat.id != config.blacklistSourceChat.toString()) {
                blacklist.blacklist.forEach(async (user) => {
                    let isMember = await bot.getChatMember(chat.id, user.id);
                    if (isMember.status == 'member') {
                        await bot.banChatMember(chat.id, user.id);
                        let text = 'global_banned <a href="tg://user?id=' + user.id + '">' + user.id + '</a>\n(flagged as malicious by <a href="tg://user?id=' + user.by + '">' + user.by + '</a> in chat <code>' + user.src + '</code>)';
                        await bot.sendMessage(chat.id, text, tgOptions);
                        console.log('> BLACKLIST banned user ' + user.id + ' from chat ' + chat.id + ' (source chat: ' + user.src + " / flagged by:" + user.by + ')');
                        await blacklistCounter(chat.id, 'inc');
                    }
                });
            }
        });
    }
    return;
}

export { watchdogBlacklist }