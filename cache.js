const nodeCache = require("node-cache");
const cache = new nodeCache();

async function cacheGet(key) {
    return await cache.get(key);
}

async function cacheSet(key, data) {
    await cache.set(key, data);
    return true;
}

async function cacheGetRoundCount() {
    return await cache.get('rounds');
}

async function cacheIncrementRoundCount() {
    let rounds = await cacheGetRoundCount();
    if (!rounds) {
        await cache.set('rounds', 1);
    }
    else {
        rounds++;
        await cache.set('rounds', rounds);
    }
    return true;
}

module.exports = {
    cacheGet,
    cacheSet,
    cacheGetRoundCount,
    cacheIncrementRoundCount
}