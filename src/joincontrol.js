import config from '../config.js'
import { throwError } from './errors.js';
import { bot, tgOptions } from './bot.js';

function joincontrolActive(msg) {
    var activeForThisChat = false;
    if (config.joinControl.active) {
        if (config.joinControl.groups.indexOf(msg.chat.id) > -1) {
            activeForThisChat = true;
        }
    }
    return activeForThisChat;
}

async function authA(newMember, chatId) {
    var nums = generateRandomNumbers();
    var text = '<b>(' + nums.x + ' + ' + nums.y + ')</b> ' + getUserGreetText(newMember);
    text = text + ', please send the solution to the arithmetic operation provided at the beginning of this message within ' + config.joinControl.timeout + ' sec, otherwise you will be kicked.\n\n<i><a href="' + config.ccStakeWithUsUrl + '">powered by CryptoCrew Validators</a></i>';
    try {
        var sent = await bot.sendMessage(chatId, text, tgOptions);
    }
    catch (e) {
        throwError(e);
    }
    newMember.joinTime = new Date().getTime();
    newMember.chatid = chatId;
    newMember.msgid = sent.message_id;
    newMember.auth = 0;
    newMember.res = nums.res;
    return newMember;
}

async function authB(msg, user) {
    var text = await getUserGreetText(user);
    text = text + ', because of the danger of being scammed in any public telegram-room, please also answer the following question using the buttons below:\n\n<b>Will Admins or Support ever contact you in a direct message?</b>';
    var keyboard = keyboardYesNo(user.id);
    var kbOptions = {
        "disable_web_page_preview": true,
        "parse_mode": "HTML",
        "reply_markup": keyboard
    }
    try {
        var sent = await bot.sendMessage(msg.chat.id, text, kbOptions);
    }
    catch (e) {
        throwError(e);
    }
    user.msgid = sent.message_id;
    return user;
}

async function solveAuth(cb, users) {
    try {
        await bot.deleteMessage(cb.message.chat.id, cb.message.message_id);
    }
    catch (e) {
        throwError(e);
    }
    if (cb.data.split('_')[0] == 'n') {
        users.forEach(async (user, index, arr) => {
            if (user.id == cb.from.id && user.chatid == cb.message.chat.id) {
                console.log('> USER ENTERED: ' + getUserGreetText(user) + ' (ID: ' + user.id + '), chat ' + user.chatid);
                arr.splice(index, 1);
            }
        });
    }
    if (cb.data.split('_')[0] == 'y') {
        users.forEach(async (user, index, arr) => {
            if (user.id == cb.from.id && user.chatid == cb.message.chat.id) {
                user.auth++;
                if (user.auth >= 3) {
                    try {
                        await bot.deleteMessage(cb.message.chat.id, user.sticker);
                    }
                    catch (e) {
                        throwError(e);
                    }
                }
                if (user.auth >= 2 && user.auth < 4) {
                    var sticker = await bot.sendSticker(cb.message.chat.id, config.stickers.dmwarningblue);
                    user.sticker = sticker.message_id;
                    user = await authB(cb.message, user);
                }
                if (user.auth >= 4) {
                    console.log('> USER KICKED: ' + getUserGreetText(user) + ' (ID: ' + user.id + '), chat ' + user.chatid + ' (3x wong answer)');
                    arr.splice(index, 1);
                    await bot.banChatMember(user.chatid, user.id);
                    if (cb.message.chat.type == 'channel' || cb.message.chat.type == 'supergroup') {
                        await bot.unbanChatMember(user.chatid, user.id);
                    }
                }
            }
            return;
        });
    }
}
    

function getUserGreetText(user) {
    var text = "";
    if (user.username != undefined) {
        text = text + ' @' + user.username;
    }
    if (user.username == undefined) {
        text = text + ' ' + user.first_name;
        if (user.last_name != undefined) {
            text = text + ' ' + user.last_name;
        }
    }
    return text;
}

function generateRandomNumbers() {
    var nums = {
        x: Math.floor(Math.random() * 10) + 1,
        y: Math.floor(Math.random() * 10) + 1,
    }
    nums.res = nums.x + nums.y;
    return nums;
}

function keyboardYesNo(userid) {
    var keyboard = {
        inline_keyboard: [
            [
                {
                    text: "YES",
                    callback_data: "y_" + userid
                },
                {
                    text: "NO",
                    callback_data: "n_" + userid
                },
            ]
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
        selective: true
    }
    return keyboard;
}

export {
    joincontrolActive,
    authA,
    authB,
    solveAuth
}