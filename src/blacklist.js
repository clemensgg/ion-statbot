import config from '../config.js'
import fs from 'fs/promises';
import { bot } from './bot.js';
import { throwError } from './errors.js';
import { cacheGet, cacheSet } from './cache.js';

import {
    sheetWriteBlacklistUsers,
    sheetWriteBlacklistChats,
} from './sheet.js';

async function fsReadBlacklist() {
    let data = null;
    let blacklist = { "blacklist": [], "chats": [] }
    if (config.blacklistFileUrl) {
        try {
            data = JSON.parse(await fs.readFile(config.blacklistFileUrl, { encoding: 'utf8' }));
        }
        catch (e) {
            throwError(e);
            console.log('> ERROR reading blacklist!');
            console.log('> initializing new blacklist');
            await fsWriteBlacklist(blacklist);
            data = blacklist;
        }
        data = data;
    }
    return data;
}

async function fsWriteBlacklist(blacklist) {
    try {
        await fs.writeFile(config.blacklistFileUrl, JSON.stringify(blacklist));
    }
    catch (e) {
        throwError(e);
        console.log('> ERROR writing blacklist to filesystem');
        return false;
    }
    return true;
}

async function saveBlacklist(blacklist) {
    let saved = await fsWriteBlacklist(blacklist);
    if (saved) {
        if (blacklist.hasOwnProperty('blacklist')) {
            await sheetWriteBlacklistUsers(blacklist.blacklist);
        }
        if (blacklist.hasOwnProperty('chats')) {
            await sheetWriteBlacklistChats(blacklist.chats);
        }
        return true;
    }
    return false;
}

async function checkBlacklist(userid) {
    let blacklist = await cacheGet("blacklist");
    if (!blacklist) {
        blacklist = await fsReadBlacklist();
    }
    if (blacklist) {
        let index = blacklist.blacklist.findIndex(item => item.id == userid.toString());
        if (index > -1) return true;
        else return false;
    }
    return false
}

async function newGlobalBan(msg) {
    let blacklist = await fsReadBlacklist();
    blacklist.blacklist.push({
        "id": msg.reply_to_message.from.id,
        "username": msg.reply_to_message.from.username,
        "first_name": msg.reply_to_message.from.first_name,
        "last_name": msg.reply_to_message.from.last_name,
        "by": msg.from.id,
        "src": msg.chat.id,
        "ts": new Date().toISOString()
    });
    blacklist.chats.forEach((chat) => {
        if (chat.id == msg.chat.id) {
            chat.n++
        }
    });
    await cacheSet('blacklist', blacklist);
    let saved = await saveBlacklist(blacklist);
    if (saved) {
        console.log('BLACKLIST new global ban user id: ' + msg.reply_to_message.from.id);
        return true;
    }
    return false;
}

async function newGlobalUnban(userid) {
    let blacklist = await fsReadBlacklist();
    let unbanned = false
    blacklist.blacklist.forEach(async (user, index, arr) => {
        if (user.id == userid) {
            blacklist.chats.forEach(async (chat) => {
                await bot.unbanChatMember(chat.id, userid);
                chat.n--;
            });
            arr.splice(index, 1);
            unbanned = true;
        }
    });
    if (unbanned) {
        await cacheSet('blacklist', blacklist);
        let saved = await saveBlacklist(blacklist);
        if (saved) {
            console.log('BLACKLIST ubanned user id: ' + userid);
        }
    }
    return unbanned;
}

async function blacklistSaveNewChat(msg) {
    let blacklist = await fsReadBlacklist();
    if (blacklist.chats.findIndex(item => item.id == msg.chat.id.toString()) == -1) {
        blacklist.chats.push({
            "id": msg.chat.id,
            "adm": false,
            "n": 0,
        });
    }
    await cacheSet('blacklist', blacklist);
    let saved = await saveBlacklist(blacklist);
    if (saved) {
        console.log('BLACKLIST joined new chat id: ' + msg.chat.id);
        return true;
    }
    return false;
}

async function blacklistRemoveChat(msg) {
    let blacklist = await fsReadBlacklist();
    blacklist.chats.forEach((chat, index, arr) => {
        if (msg.chat.id == chat.id) {
            arr.splice(index, 1);
        }
    });
    await cacheSet('blacklist', blacklist);
    let saved = await saveBlacklist(blacklist);
    if (saved) {
        console.log('BLACKLIST removed from chat id: ' + msg.chat.id);
        return true;
    }
    return false;
}

async function blacklistCounter(chatid, method) {
    let blacklist = await fsReadBlacklist();
    blacklist.chats.forEach((chat) => {
        if (chat.id == chatid) {
            if (method == 'inc') {
                chat.n++;
            }
            else if (method == 'dec') {
                chat.n--;
            }
        }
    });
    await cacheSet('blacklist', blacklist);
    let saved = await saveBlacklist(blacklist);
    if (saved) {
        return true;
    }
    return false;
}

async function blacklistNewAdmin(chatid) {
    let blacklist = await fsReadBlacklist();
    blacklist.chats.forEach((chat) => {
        if (chat.id == chatid) {
            chat.adm = true;;
        }
    });
    await cacheSet('blacklist', blacklist);
    let saved = await saveBlacklist(blacklist);
    if (saved) {
        console.log(console.log('BLACKLIST got promoted to admin in chat: ' + chatid));
        return true;
    }
    return false;
}

export {
    fsReadBlacklist,
    saveBlacklist,
    checkBlacklist,
    newGlobalBan,
    newGlobalUnban,
    blacklistSaveNewChat,
    blacklistRemoveChat,
    blacklistCounter,
    blacklistNewAdmin
}