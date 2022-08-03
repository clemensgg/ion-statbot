const config = require('./config.json');
const fs = require('fs/promises');
const { throwError } = require('./errors.js');
const { cacheGet, cacheSet } = require('./cache.js');
const { bot } = require('./bot.js');

async function readBlacklist() {
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
            await writeBlacklist(blacklist);
            data = blacklist;
        }
        data = data;
    }
    return data;
}

async function writeBlacklist(blacklist) {
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

async function checkBlacklist(userid) {
    let blacklist = await cacheGet("blacklist");
    if (!blacklist) {
        blacklist = await readBlacklist();
    }
    if (blacklist) {
        let index = blacklist.blacklist.findIndex(item => item.id === userid);
        if (index > -1) return true;
        else return false;
    }
    return false
    
}

async function newGlobalBan(msg) {
    let blacklist = await readBlacklist();
    blacklist.blacklist.push({
        "id": msg.reply_to_message.from.id,
        "by": msg.from.id,
        "src": msg.chat.id,
        "ts": new Date().toISOString()
    });
    await cacheSet('blacklist', blacklist);
    let res = await writeBlacklist(blacklist);
    if (res) {
        console.log('BLACKLIST updated! id: ' + msg.reply_to_message.from.id);
    }
    return res;
}

async function blacklistSaveNewChat(msg) {
    let blacklist = await readBlacklist();
    blacklist.chats.push({
        "id": msg.chat.id,
        "adm": false,
        "n": 0,
    });
    await cacheSet('blacklist', blacklist);
    let res = await writeBlacklist(blacklist);
    if (res) {
        console.log('BLACKLIST joined new chat! id: ' + msg.chat.id);
    }
    return res;
}

async function blacklistIncCounter(chatid) {
    let blacklist = await readBlacklist();
    blacklist.chats.forEach((chat) => {
        if (chat.id == chatid) {
            chat.n++;
        }
    });
    let res = await writeBlacklist(blacklist);
    return res;
}

async function blacklistNewAdmin(chatid) {
    let blacklist = await readBlacklist();
    blacklist.chats.forEach((chat) => {
        if (chat.id == chatid) {
            chat.adm = true;;
            console.log('BLACKLIST got promoted to admin in chat: ' + chatid);
        }
    });
    let res = await writeBlacklist(blacklist);
    return res;
}

module.exports = {
    checkBlacklist,
    readBlacklist,
    writeBlacklist,
    newGlobalBan,
    blacklistSaveNewChat,
    blacklistIncCounter,
    blacklistNewAdmin
}