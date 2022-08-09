import config from '../config.js'
import { throwError } from './errors.js';

import axios from 'axios';
import osmosis from 'osmojs';

import CoinGecko from 'coingecko-api';
const CoinGeckoClient = new CoinGecko();

const LCDClient = osmosis.osmosis.gamm.v1beta1.LCDQueryClient;
const osmoClient = new LCDClient({ restEndpoint: config.osmoLCDurl });

import { GoogleSpreadsheet } from 'google-spreadsheet';
const gDoc = new GoogleSpreadsheet(config.googleSheetID);

function getImperatorUrl(method, params) {
    var url = config.imperatorUrl;
    switch (method) {
        case 'healthcheck': return url + '/health/v1/check';
        case 'ibc/all': return url + '/ibc/v1/all';
        case 'pools/all': return url + '/pools/v2/all?low_liquidity=' + params.low_liquidity;
        case 'pools/liquidity/chart': return url + '/pools/v2/liquidity/' + params.pool_id + '/chart';
        case 'pools/volume/chart': return url + '/pools/v2/volume/' + params.pool_id + '/chart';
        case 'tokens/all': return url + '/tokens/v2/all';
        case 'tokens/historical/chart': return url + '/tokens/v2/historical/' + params.symbol + '/chart?tf=' + params.timeframe;
        case 'tokens/liquidity/chart': return url + '/tokens/v2/liquidity/' + params.symbol + '/chart';
        case 'tokens/volume/chart': return url + '/tokens/v2/volume/' + params.symbol + '/chart';
        case 'metrics': return url + '/overview/v1/metrics';
        case 'liquidity/historical/chart': return url + 'liquidity/v2/historical/chart';
        case 'volume/historical/chart': return url + 'volume/v2/historical/chart';
        case 'apr/staking': return url + '/apr/v2/staking';
        case 'apr/all': return url + '/apr/v2/all';
    }
    return false;
}

async function fetchOsmoLCD(method, params) {
    try {
        var res = await osmoClient.request(method, params);
    }
    catch (e) {
        throwError(e);
        return false;
    }
    console.log('> fetched OsmoLCD ' + method);
    return res;
}

async function fetchImperator(method, params) {
    try {
        var res = await axios.get(getImperatorUrl(method, params));
    }
    catch (e) {
        throwError(e);
        return false;
    }
    res = res.data;
    if (method != 'healthcheck') {
        console.log('> fetched Imperator ' + method);
    }
    return res;
}


export {
    fetchImperator,
    fetchOsmoLCD,
    CoinGeckoClient,
    gDoc
}