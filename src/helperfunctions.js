const config = require('../config.json');
const { bot } = require('./bot.js');
const { cacheGet } = require('./cache.js');

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

module.exports = {
    isAdmin,
    isActiveCommand,
    isAssetCommand,
    isMe,
    resolveDec,
    aprApy,
    fixPoolArray,
    filterAPRs,
    dynamicSort
}