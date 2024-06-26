import config from '../config.js'
import cgids from '../coingecko_ids.js';

import { fetchImperator, fetchOsmoLCD, CoinGeckoClient } from './clients.js';
import { fixPoolArray, filterAPRs } from './helperfunctions.js';
import { throwError } from './errors.js';


async function resolveOsmoStakingStats() {
    let res = await fetchOsmoLCD('/cosmos/staking/v1beta1/params');
    let totalVals = parseInt(res.params.max_validators);
    res = await fetchOsmoLCD('/cosmos/bank/v1beta1/supply_without_offset/uosmo');
    let osmoSupply = parseInt(res.amount.amount);
    let totalBonded = 0;
    let nextKey = "";
    let validators = [];
    while (nextKey != null) {
        let res = await fetchOsmoLCD('/cosmos/staking/v1beta1/validators', { "params": { "pagination.key": nextKey } });
        nextKey = res.pagination.next_key;
        res = res.validators;
        res.forEach((validator) => {
            validators.push(validator);
        });
    }
    validators.forEach((validator) => {
        if (validator.status == 'BOND_STATUS_BONDED') {
            totalBonded = totalBonded + parseInt(validator.delegator_shares);
        }
    });
    let lastBlock = await fetchOsmoLCD('/cosmos/base/tendermint/v1beta1/blocks/latest');
    lastBlock = lastBlock.block;
    return {
        "latestBlockHeight": lastBlock.header.height,
        "latestBlockTime": new Date(lastBlock.header.time).toISOString(),
        "numBondedValidators": totalVals,
        "totalBondedOsmo": totalBonded,
        "osmoCirculatingSupply": osmoSupply,
        "bondedRatio": totalBonded / osmoSupply * 100,
        "validators": validators,
        "lastUpdated": new Date().toISOString()
    };
}

async function runImperatorHealthCheck() {
    console.log("running Imperator healthcheck... URL: " + config.imperatorUrl);
    let res = await fetchImperator("healthcheck");
    if (res) {
        console.log("> Imperator responding");
    }
    else {
        console.log("Imperator ERROR!");
    }
    return res;
}

async function runOsmoLCDhealthCheck() {
    console.log("running OsmoLCD healthcheck... URL: " + config.osmoLCDurl);
    let caughtUp = false;
    let syncing = null;
    let lastBlock = {};
    let res = await fetchOsmoLCD('/cosmos/base/tendermint/v1beta1/syncing');
    if (!res) {
        console.log("OsmoLCD ERROR!");
    }
    else {
        console.log("> OsmoLCD responding");
        syncing = res.syncing;
        if (!syncing) {
            caughtUp = true;
        }
    }
    res = await fetchOsmoLCD('/cosmos/base/tendermint/v1beta1/blocks/latest');
    if (res) {
        lastBlock = res;
        return {
            "caughtUp": caughtUp,
            "latestBlockHeight": lastBlock.block.header.height,
            "latestBlockTime": new Date(lastBlock.block.header.time).toISOString()
        }
    }
    else {
        return {
            "caughtUp": caughtUp,
            "latestBlockHeight": null,
            "latestBlockTime": null
        }
    }
}

async function runCoinGeckoHealthCheck() {
    console.log("running Coingecko healthcheck...");
    try {
        var res = await CoinGeckoClient.ping();
    }
    catch (e) {
        throwError(e)
        console.log("Coingecko ERROR!");
        return false;
    }
    console.log("> Coingecko says:" + res.data.gecko_says);
    return res.data;
}

//async function fetchCoin(cgid) {

//}


async function fetchGeckoData(tokens) {
    let ids = cgids.tokens;
    tokens.forEach((token) => {
        ids.forEach((cgtoken) => {
            if (token.symbol.toLowerCase() == cgtoken.osmo_symbol.toLowerCase()) {
                if (cgtoken.id) {
                    token.coingecko = {
                        "id": cgtoken.id
                    }
                }
            }
        });
        if (token.hasOwnProperty('coingecko')) {
            //token = await fetchCoin(token.coingecko.id);
        }
        else {
            console.log('WARN: no coingecko data found for ' + token.symbol);
        }
    });
    return tokens;
}

async function fetchImperatorData() {
    return {
        "metrics": await fetchImperator("metrics"),
        "ibc": await fetchImperator("ibc/all"),
        "tokens": await fetchImperator("tokens/all"),
        "pools": fixPoolArray(await fetchImperator("pools/all", { "low_liquidity": true })),
        "apr_staking": await fetchImperator("apr/staking"),
        "apr_all": filterAPRs(await fetchImperator("apr/all")),
        "lastUpdated": new Date().toISOString()
    }
}


export {
    runImperatorHealthCheck,
    runOsmoLCDhealthCheck,
    runCoinGeckoHealthCheck,
    fetchImperatorData,
    resolveOsmoStakingStats,
    fetchGeckoData,
}