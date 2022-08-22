import config from '../config.js'
import { bot } from './bot.js';
import { cacheGet } from './cache.js';

const emoji = {
    "fingerShow": "\u{1F449}",
    "lock": "\u{1F512}",
    "restake": "\u{1F504}",
    "checkmark": "\u{2705}",
    "testTube": "\u{1F9EA}",
    "greenDot": "\u{1F7E2}",
    "yellowDot": "\u{1F7E1}",
    "redDot": "\u{1F534}",
    "arrowUpSimple": "\u{2191}",
    "arrowDownSimple": "\u{2193}",
    "atom": "\u{269B}",
    "ion": "\u{1F9FF}",
    "starDust": "\u{2728}",
    "link": "\u{1F517}"
}

async function isAdmin(userid, chatid) {
    let admins = await bot.getChatAdministrators(chatid);
    let index = admins.findIndex(admin => admin.user.id === userid);
    if (index > -1) return true;
    else return false;
}

async function isMe(newMember) {
    let me = await cacheGet('bot');
    if (!me) {
        me = await bot.getMe();
    }
    let botNewChat = false;
    if (newMember.id == me.id) {
        botNewChat = true;
    }
    return botNewChat;
}

function isActiveCommand(text) {
    if (text.includes(' ')) {
        text = text.split(' ')[0];
    }
    if (config.activeCommands.indexOf(text) > -1) {
        return true;
    }
    else return false;
}

async function isAssetCommand(text) {
    let assetCommands = await cacheGet("assetcommands");
    if (assetCommands) {
        if (assetCommands.indexOf(text) > -1) {
            return true;
        }
    }
    else return false;
}

async function isChartParam(text) {
    if (text.toUpperCase() == 'O' || text.toUpperCase() == 'OVERVIEW' || text.toUpperCase() == 'OSMOSIS') {
        return true;
    }
    let assetCommands = await cacheGet("assetcommands");
    if (assetCommands) {
        let assets = []
        assetCommands.forEach((command) => {
            assets.push(command.toUpperCase().replace('/', ''));
        });
        if (assets.indexOf(text.toUpperCase()) > -1) {
            return true;
        }
        else return false;
    }
    return false;
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

function resolveDec(symbol, amount, osmoData) {
    let res = null;
    if (osmoData) {
        osmoData.tokens.forEach((token) => {
            if (token.symbol.toLowerCase() == symbol.toLowerCase()) {
                res = (amount / Math.pow(10, token.exponent))
            }
        });
    }
    return res;
}

function fixPoolArray(pools) {
    var res = [];
    var keys = Object.keys(pools);
    keys.forEach((key) => {
        pools[key].id = key;
        res.push(pools[key]);
    });
    return res;
}

function filterAPRs(apr_all) {
    apr_all.forEach((pool, poolindex, poolarr) => {
        pool.apr_list.forEach((apr, index, arr) => {
            if (apr.apr_14d < 0.1 || apr.apr_14 == 0) {
                arr.splice(index, 1);
            }
        });
        if (pool.apr_list.length == 0) {
            poolarr.splice(poolindex, 1);
        }
    });
    return apr_all;
}

function aprApy(apr) {
    if (apr.toString().includes('%')) {
        apr = parseFloat(apr.toString().replace('%', ''));
    }
    return ((Math.pow((1 + ((apr / 100) / 365)), 365) - 1) * 100);
}

function dynamicSort(property) {
    let sortOrder = 1;
    if (property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a, b) {
        let result = (a[property] > b[property]) ? -1 : (a[property] < b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}

function countDecimals(value) {
    if ((value % 1) != 0)
        return value.toString().split(".")[1].length;
    return 0;
};

function getFloatTextSymbol(number) {
    if (number == 0) return "";
    if (number < 0) return emoji.arrowDownSimple;
    if (number > 0) return emoji.arrowUpSimple;
}

function getFloatPrefix(number) {
    if (number == 0) return "";
    if (number < 0) return "-";
    if (number > 0) return "+";
}

function formatFloat(number, decimals) {
    return Math.abs(number).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
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

function keyboardGlobalbanYesNo(adminid, user) {
    var keyboard = {
        inline_keyboard: [
            [
                {
                    text: "YES",
                    callback_data: "bany_" + adminid + "_" + JSON.stringify(user)
                },
                {
                    text: "NO",
                    callback_data: "bann_" + adminid + "_" + JSON.stringify(user)
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
    emoji,
    isAdmin,
    isChartParam,
    isActiveCommand,
    isAssetCommand,
    isMe,
    getUserGreetText,
    generateRandomNumbers,
    resolveDec,
    aprApy,
    fixPoolArray,
    filterAPRs,
    dynamicSort,
    countDecimals,
    getFloatTextSymbol,
    getFloatPrefix,
    formatFloat,
    keyboardYesNo,
    keyboardGlobalbanYesNo
}