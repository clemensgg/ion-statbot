'use strict';
// whitelist bot to receive all tg update types
// https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates?allowed_updates=["update_id","message","edited_message","channel_post","edited_channel_post","inline_query","chosen_inline_result","callback_query","shipping_query","pre_checkout_query","poll","poll_answer","my_chat_member","chat_member"]

// init config, cache, errors, helperfunctions
const config = require('./config.json');
const { cacheGet, cacheSet } = require('./src/cache.js');
const { throwError } = require('./src/errors.js');
const { isAdmin, isActiveCommand, isAssetCommand, isMe } = require('./src/helperfunctions.js');

// init updater
const { intervalCacheData } = require('./src/update.js');

// init telegram bot
const { bot, tgOptions } = require('./src/bot.js');

// init textGenerator
const {
    generateBotCommandAnswer,
    generateAssetCommandAnswer,
    generateSupportCommandAnswer,
    generateBlacklistAnswer
} = require('./src/text_generator.js');

// init gobal blacklist
const {
    checkBlacklist,
    newGlobalBan,
    newGlobalUnban,
    blacklistSaveNewChat,
    blacklistCounter,
    blacklistRemoveChat
} = require('./src/blacklist.js');

// init joincontrol
const {
    joincontrolActive,
    authA,
    authB,
    solveAuth
} = require('./src/joincontrol.js');
var users = [];

// init autodelete message watchdog
const { watchdogAutodelete } = require('./src/watchdog_autodelete');
const { watchdogBlacklist } = require('./src/watchdog_blacklist');

// respond to all the chat member updates...
bot.on('chat_member', async (msg) => {
    if (msg.hasOwnProperty('new_chat_members')) {
        msg.new_chat_members.forEach(async (newMember) => {
            let botNewChat = await isMe(newMember);
            if (botNewChat) {
                await blacklistSaveNewChat(msg);
            }
            else {
                if (joincontrolActive(msg)) {
                    enterAuthA(msg, newMember);
                }
            }
        });
    }
    else {
        if (msg.hasOwnProperty('new_chat_member')) {
            if (msg.new_chat_member.status == 'member') {
                let botNewChat = await isMe(msg.new_chat_member.user);
                if (botNewChat) {
                    await blacklistSaveNewChat(msg);
                }
                else {
                    if (joincontrolActive(msg)) {
                        enterAuthA(msg, msg.new_chat_member.user);
                    }
                }
            }
            if (msg.new_chat_member.status == 'left' || msg.new_chat_member.status == 'kicked') {
                let botLeftChat = await isMe(msg.new_chat_member.user);
                if (botLeftChat) {
                    await blacklistRemoveChat(msg);
                }
                await userExit(msg, msg.new_chat_member.user);
            }
        }
    }
    return;
})

// respond to all messages
bot.on('message', async (msg) => {
    if (msg.hasOwnProperty('left_chat_member')) {
        let botLeftChat = await isMe(msg.left_chat_member);
        if (botLeftChat) {
            await blacklistRemoveChat(msg);
        }
        if (joincontrolActive(msg)) {
            try {
                await bot.deleteMessage(msg.chat.id, msg.message_id);
            }
            catch (e) {
                throwError(e);
            }
            return;
        }
    }
    if (msg.hasOwnProperty('new_chat_member')) {
        let botNewChat = await isMe(msg.new_chat_member);
        if (botNewChat) {
            await blacklistSaveNewChat(msg);
            return;
        }
        else {
            if (joincontrolActive(msg)) {
                try {
                    await bot.deleteMessage(msg.chat.id, msg.message_id);
                }
                catch (e) {
                    throwError(e);
                }
            }
        }
    }
    if (!msg.hasOwnProperty('entities')) {
        // Joincontrol authstep B
        users.forEach(async (user) => {
            if (user.id == msg.from.id && user.chatid == msg.chat.id) {
                try {
                    await bot.deleteMessage(msg.chat.id, msg.message_id);
                }
                catch (e) {
                    throwError(e);
                }
                // solved auth A (delete captcha)
                if (msg.text == user.res) {
                    try {
                        await bot.deleteMessage(msg.chat.id, user.msgid);
                    }
                    catch (e) {
                        throwError(e);
                    }
                    user.auth++;
                    user = await authB(msg, user);
                }
                // delete wrong answer or any other message from newUser
                else {
                    try {
                        await bot.deleteMessage(msg.chat.id, msg.message_id);
                    }
                    catch (e) {
                        throwError(e);
                    }
                }

            }
        });
    }
    // respond to botcommands
    else if (msg.hasOwnProperty('entities')) {
        tgOptions.reply_to_message_id = msg.message_id;
        msg.text = msg.text.toLowerCase();
        if (msg.entities[0].type == 'bot_command' && msg.text.slice(0, 1) == '/') {
            if (msg.text.includes('@')) {
                msg.text = msg.text.split('@')[0];
            }
            let text = "";
            let isActCmd = await isActiveCommand(msg.text);
            if (isActCmd) {
                let osmoData = await cacheGet('osmosis');
                let stakingData = await cacheGet('staking');
                if (osmoData && stakingData) {
                    text = generateBotCommandAnswer(msg, osmoData, stakingData);
                }
                else text = '<i>database not synced, please try again in a few minutes..</i>';
                var answer = await bot.sendMessage(msg.chat.id, text, tgOptions);
            }
            let isAssCmd = await isAssetCommand(msg.text.toLowerCase())
            if (isAssCmd) {
                let osmoData = await cacheGet('osmosis');
                if (osmoData) {
                    text = generateAssetCommandAnswer(msg, osmoData);
                }
                else text = '<i>database not synced, please try again in a few minutes..</i>';
                var answer = await bot.sendMessage(msg.chat.id, text, tgOptions);
            }
            // mark for autodelete if public group
            if (answer) {
                if (msg.chat.type != 'private') {
                    let del = await cacheGet('del');
                    if (!del) {
                        del = [];
                    }
                    del.push(new Date().getTime() + "_" + msg.chat.id + "_" + answer.message_id + "_" + msg.message_id)
                    await cacheSet('del', del);
                }
            }
        }
    }
    if (tgOptions.hasOwnProperty('reply_to_message_id')) {
        delete tgOptions.reply_to_message_id;
    }
    return;
});

// Joincontrol solve Auth
bot.on('callback_query', async (cb) => {
    if (cb.data.split('_')[1] == cb.from.id) {
        await solveAuth(cb, users);
    }
    return;
});

// ban user and add to global blacklist
bot.onText(/\!globalban/, async (msg) => {
    if (msg.hasOwnProperty('reply_to_message')) {
        let text = "";
        if (config.blacklistSourceChat == msg.chat.id) {
            let adm = await isAdmin(msg.from.id, msg.chat.id);
            let userToBlacklistIsAdmin = await isAdmin(msg.reply_to_message.from.id, msg.chat.id);
            if (!userToBlacklistIsAdmin) {
                if (adm) {
                    await newGlobalBan(msg);
                    let banned = await bot.banChatMember(msg.chat.id, msg.reply_to_message.from.id);
                    if (banned) {
                        tgOptions.reply_to_message_id = msg.message_id;
                        text = 'global_banned <a href="tg://user?id=' + msg.reply_to_message.from.id + '">' + msg.reply_to_message.from.id + '</a>';
                    }
                    else text = 'there was a problem trying to ban user <a href="tg://user?id=' + msg.reply_to_message.from.id + '">' + msg.reply_to_message.from.id + '</a>'
                }
                else {
                    text = "<i>admin only!</i>";
                }
            }
            else {
                text = "<i>cannot restrict other admins!</i>";
            }
        }
        else {
            text = "<i>the global ban function is an attempt to conquer scammers and can only be triggered by osmosis admins in the osmosis main group</i>";
        }
        await bot.sendMessage(msg.chat.id, text, tgOptions);
    }
    if (tgOptions.hasOwnProperty('reply_to_message_id')) {
        delete tgOptions.reply_to_message_id;
    }
    return;
});

bot.onText(/\!blacklist|!unban/, async (msg) => {
    let adm = await isAdmin(msg.from.id, config.blacklistSourceChat);
    if (adm) {
        let text = "";
        tgOptions.reply_to_message_id = msg.message_id;
        if (msg.text == '!blacklist') {
            text = await generateBlacklistAnswer();
        }
        if (msg.text.includes('!unban')) {
            if (msg.text.includes(' ')) {
                let userid = msg.text.split(' ')[1];
                let unbanned = await newGlobalUnban(userid);
                if (unbanned) {
                    text = 'success! unbanned <a href="tg://user?id=' + userid + '">' + userid + '</a> from all chats.\n\nblacklist updated.';
                }
                else {
                    text = `sorry, can't find user ${userid} on the global blacklist or there was another error`;
                }
            }
            else {
                text = 'no user_id specified. please use <code>"!unban $id"</code>';
            }
        }
        await bot.sendMessage(msg.chat.id, text, tgOptions);
    }
    if (tgOptions.hasOwnProperty('reply_to_message_id')) {
        delete tgOptions.reply_to_message_id;
    }
    return;
});

// supportcommands (admin only)
bot.onText(/\#/, async (msg) => {
    let res = {
        "text": "",
        "pic": "",
        "tgOptions": ""
    }
    if (msg.hasOwnProperty('entities') && config.supportCommandsActive) {
        if (msg.entities[0].type == 'hashtag') {
            msg.text = '#' + msg.text.split('#')[1];
            if (msg.text.includes(' ')) {
                msg.text = msg.text.split(' ')[0];
            }
            if (msg.chat.type != 'private') {
                let adm = await isAdmin(msg.from.id, msg.chat.id);
                res.text = "<i>tutorial commands are restricted to admins</i>";
                if (adm) {
                    res = await generateSupportCommandAnswer(msg);
                    res.tgOptions.reply_to_message_id = msg.message_id;
                }
            }
            else {
                res = await generateSupportCommandAnswer(msg);
            }
            if (res.pic) {
                await bot.sendPhoto(msg.chat.id, res.pic, res.tgOptions);
            }
            else {
                if (res.text) {
                    await bot.sendMessage(msg.chat.id, res.text, res.tgOptions);
                }
            }
        }
    }
    return;
});

// log polling errors
bot.on('polling_error', (e) => {
    throwError(e);
    return;
});

//// userExit must be in main scope
async function userExit(msg, user) {
    users.forEach(async (cacheduser, index, arr) => {
        if (cacheduser.id == user.id) {
            arr.splice(index, 1);
        }
    });
    console.log('> user exited ID: ' + user.id + ', chat: ' + msg.chat.id);
    return true;
}

// authA must be in main scope
async function enterAuthA(msg, newMember) {
    // Joincontrol authstep A
    if (msg.hasOwnProperty('message_id')) {
        try {
            await bot.deleteMessage(msg.chat.id, msg.message_id);
        }
        catch (e) {
            throwError(e);
        }
    }
    // compare golbal blacklist & ban
    let blacklisted = await checkBlacklist(newMember.id);
    if (blacklisted) {
        await bot.banChatMember(msg.chat.id, newMember.id);
        await blacklistCounter(msg.chat.id, 'inc');
    }
    else {
        let user = await authA(newMember, msg.chat.id);
        users.push(user);
    }
    return true;
}

// watchdog Joincontrol must be in main scope
async function watchdogJoincontrol() {
    if (!users) {
        return;
    }
    users.forEach(async (user, index, arr) => {
        if ((((new Date().getTime() - new Date(user.joinTime).getTime()) / 1000) >= config.joinControl.timeout)) {
            if (user.hasOwnProperty('msgid')) {
                try {
                    await bot.deleteMessage(user.chatid, user.msgid);
                }
                catch (e) {
                    throwError(e)
                }
            }
            if (user.hasOwnProperty('sticker')) {
                try {
                    await bot.deleteMessage(user.chatid, user.sticker);
                }
                catch (e) {
                    throwError(e)
                }
            }
            try {
                await bot.banChatMember(user.chatid, user.id);
            }
            catch (e) {
                throwError(e)
            }
            try {
                await bot.unbanChatMember(user.chatid, user.id);
            }
            catch (e) {
                throwError(e)
            }
            console.log('> kicked user ' + user.id + ' from chat ' + user.chatid + ' (timeout ' + config.joinControl.timeout + ')');
            arr.splice(index, 1);
        }
    });
    return;
}

async function main() {
    let initBot = await bot.getMe();
    if (initBot) {
        await cacheSet('bot', initBot);
        console.log(initBot);

        setInterval(watchdogAutodelete, 20000);
        setInterval(watchdogJoincontrol, 20000);
        setInterval(watchdogBlacklist, 20000);
        watchdogAutodelete();
        watchdogJoincontrol();
        watchdogBlacklist(),
            
        setInterval(intervalCacheData, config.pollInterval * 1000);
        intervalCacheData();

       return;
    }
}

main();