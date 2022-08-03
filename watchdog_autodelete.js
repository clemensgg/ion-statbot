const config = require('./config.json');
const { throwError } = require('./errors.js');
const { cacheGet, cacheSet } = require('./cache.js');
const { bot } = require('./bot.js');

async function watchdogAutodelete() {
    let del = await cacheGet('del');
    if (del) {
        if (del[0]) {
            del.forEach(async (obj, index, arr) => {
                let msg = obj.split('_')
                if (new Date().getTime() - parseInt(msg[0]) >= (config.autodeleteTimeout * 1000)) {
                    if (msg[2] == msg[3]) {
                        try {
                            await bot.deleteMessage(msg[1], msg[2]);
                        }
                        catch (e) {
                            throwError(e)
                        }
                    }
                    if (msg[2] != msg[3]) {
                        try {
                            await bot.deleteMessage(msg[1], msg[2]);
                        }
                        catch (e) {
                            throwError(e)
                        }
                        try {
                            await bot.deleteMessage(msg[1], msg[3]);
                        }
                        catch (e) {
                            throwError(e)
                        }
                    }
                    arr.splice(index, 1);
                }
            });
            await cacheSet('del', del);
        }
    }
    return;
}

module.exports = { watchdogAutodelete }