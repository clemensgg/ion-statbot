import { cacheGet, cacheSet } from './cache.js';

async function getErrorCount() {
    var errs = await cacheGet('errorCounter');
    if (!errs) {
        return 0;
    }
    else return errs;
}

async function incErrorCount() {
    var errs = await cacheGet('errorCounter');
    if (!errs) errs = 1;
    else errs = errs + 1;
    await cacheSet('errorCounter', errs);
    return;
}

async function resetErrorCount() {
    await cacheSet('errorCounter', 0);
    return;
}

async function throwError(e) {
    await incErrorCount();
    var d = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    if (e.hasOwnProperty('response')) {
        if (e.response.hasOwnProperty('data')) {
            console.error(d + " - ERROR");
            console.error(e.response.data);
        }
    }
    else {
        console.error(d + " - ERROR");
        console.error(e);
    }
    return;
}

export {
    throwError,
    getErrorCount,
    resetErrorCount
}