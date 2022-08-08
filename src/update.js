const { resetErrorCount, getErrorCount } = require('./errors.js');

const {
    cacheSet,
    cacheGetRoundCount,
    cacheIncrementRoundCount
} = require('./cache.js');

const {
    runImperatorHealthCheck,
    runOsmoLCDhealthCheck,
    runCoinGeckoHealthCheck,
    fetchImperatorData,
    resolveOsmoStakingStats,
    fetchGeckoData,
} = require('./targets.js');

const { fsReadBlacklist, saveBlacklist } = require('./blacklist.js');
const { sheetFetchSupportCommands } = require('./sheet.js');

// poll Osmosis LCD & Imperator REST, cache data
async function intervalCacheData() {
    await resetErrorCount();
    await cacheIncrementRoundCount();
    let round = await cacheGetRoundCount();
    console.log(new Date().toISOString() + ' Polling time! Round ' + round + ' les go...');

    // fetch supportcommands from google sheet
    let supportcommands = await sheetFetchSupportCommands();
    if (supportcommands) {
        await cacheSet('sp', supportcommands);
        console.log('> successfully cached ' + supportcommands.length + ' support commands from google sheet');
    }

    // fetch Imperator Osmosis data
    let imperatorHealth = await runImperatorHealthCheck();
    if (imperatorHealth) {
        var osmosisData = await fetchImperatorData();
        if (osmosisData) {
            await cacheSet('osmosis', osmosisData);
            let assetcommands = [];
            osmosisData.tokens.forEach((token) => {
                let symbol = token.symbol.toLowerCase();
                if (symbol.includes('.')) {
                    symbol = symbol.replace('.', '_');
                }
                assetcommands.push('/' + symbol);
            });
            await cacheSet('assetcommands', assetcommands);
            console.log('> successfully cached Imperator Osmosis Stats. Last update: ' + osmosisData.lastUpdated);

            let cgHealth = await runCoinGeckoHealthCheck();
            if (cgHealth) {
                var cgData = await fetchGeckoData(osmosisData.tokens);
                if (cgData) {
                    await cacheSet('gecko', cgData);
                    console.log('> successfully cached Coingecko data');
                }
            }
        }
    }
    // fetch Osmosis LCD and resolve staking data
    let osmoLDChealth = await runOsmoLCDhealthCheck();
    if (osmoLDChealth) {
        var stakingStats = await resolveOsmoStakingStats();
        if (stakingStats) {
            await cacheSet('staking', stakingStats);
            console.log('> successfully cached Staking Stats. Last update: ' + osmoLDChealth.latestBlockTime);
        }
    }

    // cache blacklist
    let blacklist = await fsReadBlacklist();
    if (blacklist) {
        await cacheSet('blacklist', blacklist);
        await saveBlacklist(blacklist);
        console.log('> successfully cached Blacklist');
    }

    console.log(new Date().toISOString() + ' Cache round done. Total rounds: ' + round + ' Errors: ' + await getErrorCount());
    return;
}

module.exports = {
    intervalCacheData
}