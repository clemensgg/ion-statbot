import config from '../config.js'
import { cacheGet } from './cache.js';
import {
    resolveDec,
    aprApy,
    dynamicSort,
    formatFloat,
    getFloatPrefix,
    getFloatTextSymbol,
    emoji
} from './helperfunctions.js';
import { fsReadBlacklist } from './blacklist.js';
import Table from 'easy-table';


function secondsToString(seconds) {
    var numdays = Math.floor((seconds % 31536000) / 86400);
    var numhours = Math.floor(((seconds % 31536000) % 86400) / 3600);
    var numminutes = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);
    var numseconds = (((seconds % 31536000) % 86400) % 3600) % 60;
    return numdays + "d " + numhours.toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false }) + ":" + numminutes.toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false }) + ":" + numseconds.toLocaleString('en-US', { minimumIntegerDigits: 2, maximumFractionDigits: 0, useGrouping: false });

}

function getOsmoIBCchannels(ibcData) {
    let channels = [];
    ibcData.forEach((channelPair) => {
        if (channelPair.destination == 'osmosis-1' || channelPair.source == 'osmosis-1') {
            channels.push(channelPair);
        }
    });
    return channels;
}

function getCongestedIBCchannels(ibcData) {
    let congestedChannels = [];
    ibcData.forEach((channelPair) => {
        if (channelPair.duration_minutes >= 5) {
            congestedChannels.push(channelPair);
        }
    });
    return congestedChannels;
}

function getIBCstatusEmoji(congestedChannels) {
    let numCongestedChannels = congestedChannels.length;
    if (numCongestedChannels < 1) return emoji.greenDot;
    if (numCongestedChannels >= 1) return emoji.yellowDot;
}

function getIBCwaitEmoji(channel) {
    if (channel.duration_minutes < 5) return emoji.greenDot;
    if (channel.duration_minutes >= 5 && channel.duration_minutes < 60) return emoji.yellowDot;
    if (channel.duration_minutes >= 60) return emoji.redDot;
}

function getCongestedChannelString(congestedChannels) {
    let text = "<code>------------------</code>\n";
    congestedChannels.forEach((channel) => {
        text = text + getIBCwaitEmoji(channel) + ` <code>${channel.source} > ${channel.destination}\n${channel.channel_id}: ${channel.size_queue} packets, ${channel.duration_minutes} min\n------------------</code>\n`
    });
    return text;
}


function getTokenOverviewString(tokens) {
    let res = []
    tokens.forEach((token) => {
        res.push(token.symbol)
    });
    res = res.sort()
    let text = "";
    res.forEach((token) => {
        text = text + '<code>' + token.replace('.', '_') + "</code>, ";
    });
    text = text.slice(0, -2);
    return text;
}

function getPool(pools, poolNumber) {
    var res = false;
    pools.forEach((pool) => {
        if (pool.id == poolNumber) {
            res = pool;
        }
    });
    return res;
}

function getPoolTokenOverview(pool) {
    let text = "";
    pool.forEach((token) => {
        let tokenLiquidity = token.amount * token.price
        let perc = (100 * (tokenLiquidity / pool[0].liquidity)).toFixed(0);
        text = text + perc + '% ' + token.symbol + " / ";
    });
    text = text.slice(0, -3);
    return text;
}

function getPoolAprList(pool, apr_all) {
    let res = null;
    apr_all.forEach((apr) => {
        if (pool.id == apr.pool_id) {
            res = apr.apr_list;
        }
    });
    return res;
}

function getPoolTokenInfos(pool, apr_all) {
    let feeAPR = (pool[0].volume_24h * pool[0].fees.slice(0,-1) * 365) / pool[0].liquidity;
    let text = "Liquidity\n";
    pool.forEach((token) => {
        text = text + token.symbol + ": " + formatFloat(token.amount, 1) + "\n";
    });
    text = text + "\nTotal liq: " + formatFloat(pool[0].liquidity, 1) + ` $<code> (${getFloatTextSymbol(pool[0].liquidity_24h_change)}` + formatFloat(Math.abs(pool[0].liquidity_24h_change), 1) + ` %)</code >
24h vol: ${formatFloat(pool[0].volume_24h, 1)} $<code> (${getFloatTextSymbol(pool[0].volume_24h_change)}` + formatFloat(Math.abs(pool[0].volume_24h_change), 1) + ` %)</code>\n
Fee: ${pool[0].fees.slice(0, -1)} %\nLP fee APY: ${formatFloat(aprApy(feeAPR), 1)} %`
    let aprList = getPoolAprList(pool, apr_all);
    if (aprList) {
        let t = new Table;
        aprList.forEach((apr) => {
            if (apr.apr_14d) {
                if (apr.apr_14d > 0.1 && apr.apr_14d < 1000) {
                    t.cell('Token', apr.symbol);
                    t.cell('APR', parseFloat(apr.apr_14d).toFixed(1) + "%");
                    t.cell('APY', parseFloat(aprApy(apr.apr_14d)).toFixed(1) + "%");
                    t.newRow();
                }
            }
        });
        text = text + "\n\n" + emoji.starDust + " Rewards (14d bonding)\n<code>" + t.toString() + "</code>";
    }
    return text;
}

function getTopRatedPools(apr_all, poolsData) {
    let pools = []
    apr_all.forEach((pool) => {
        let totalApr = 0;
        pool.apr_list.forEach((apr) => {
            if (apr.apr_14d > 0.1 && apr.apr_14d < 1000) {
                totalApr = totalApr + apr.apr_14d;
            }
        });
        pools.push({
            "pool_id": pool.pool_id,
            "total_apr": totalApr
        })
    });
    pools = pools.sort(dynamicSort('total_apr'));
    let t = new Table;
    if (pools) {
        for (let i = 0; i < 10; i++) {
            let tokens = ""
            poolsData.forEach((pool) => {
                if (pool.id == pools[i].pool_id) {
                    pool.forEach((token) => {
                        tokens = tokens + token.symbol + "/";
                    });
                }
            });
            tokens = tokens.slice(0, -1).slice(0, 11);
            t.cell('Pool', pools[i].pool_id);
            t.cell('Tokens', tokens);
            t.cell('APR', parseFloat(pools[i].total_apr).toFixed(0) + "%");
            t.newRow();
        }
        return t.toString();
    }
    return "";
}

function generateBotCommandAnswer(msg, osmoData, stakingData) {
    let command = msg.text;
    let params = null;
    if (msg.text.includes(' ')) {
        params = command.split(' ');
        params.shift();
        command = command.split(' ')[0];
    }
    let text = "";
    switch (command) {
        case '/echogroupid': {
            text = "UserID: " + msg.from.id + "\n\nChatID: " + msg.chat.id
            break;
        }
        case '/info': case '/start': case '/commands': case '/help': {
            text = `<b>@osmosis_statbot by ${emoji.checkmark}<a href="${config.ccStakeWithUsUrl}"> CryptoCrew</a></b>\n
available commands:
/chart <code>type symbol timeframe</code> - charts
/osmosis - overview
/ibc - ibc channel stats
/apr - list top pools & staking apr
/staking - staking stats
/pool <code>poolnr</code> - pool stats
/tokens - supported tokens
/tokenname - token stats
/aprtoapy <code>aprval</code> - calculate apy\n
datasources:
Imperator.co API,
OsmosisLCD, coingecko.com
admin: @clemensg`;
            break;
        }
        case '/staking': {
            if (stakingData) {
                let bonded = resolveDec('osmo', stakingData.totalBondedOsmo, osmoData);
                text = emoji.lock + ' <b> Staking - <a href="` + config.osmoLink + `">osmosis.zone</a></b>\n\nTotal staked: ' + formatFloat(bonded, 1) + ' OSMO\nStaked ratio: ' + formatFloat(stakingData.bondedRatio, 2) + ' %\nTotal active validators: ' + stakingData.numBondedValidators +
                    '\n\nStaking APR: ' + formatFloat(osmoData.apr_staking, 1) + ' %\nStaking APY: ' + formatFloat(aprApy(osmoData.apr_staking), 1) + ' %' +
                    '\n\n' + emoji.fingerShow + ' <a href="' + config.ccStakeWithUsUrl + '">Stake with CryptoCrew</a>\n' + emoji.restake + ' <a href="https://restake.app">Compound your rewards with REstake.app</a>';
            }
            break;
        }
        case '/osmosis': {
            if (stakingData && osmoData) {
                let lastUpdatedDiffSec = (new Date().getTime() - new Date(stakingData.latestBlockTime).getTime()) / 1000;
                let liq24h = osmoData.metrics.liquidity_usd * osmoData.metrics.liquidity_usd_24h / 100;
                let vol24h = osmoData.metrics.volume_24h * osmoData.metrics.volume_24h_change / 100;
                let osmoChannels = getOsmoIBCchannels(osmoData.ibc);
                let congestedChannels = getCongestedIBCchannels(osmoChannels);
                text = `${emoji.testTube}<b> Overview - <a href="` + config.osmoLink + `">osmosis.zone</a></b>
\nLast updated block height: ${stakingData.latestBlockHeight}
<code>(${secondsToString(lastUpdatedDiffSec)} ago</code>)\n
Total tokens: ${osmoData.tokens.length} \nTotal pools: ${osmoData.pools.length}
\nLiquidity: ${formatFloat(osmoData.metrics.liquidity_usd, 0)} $\n24h: ${getFloatPrefix(liq24h)}${formatFloat(Math.abs(liq24h), 1)} $ <code>(${getFloatTextSymbol(osmoData.metrics.liquidity_usd_24h)}` + Math.abs(osmoData.metrics.liquidity_usd_24h).toFixed(1) + `%)</code>`
                text = text + '\nVolume: ' + formatFloat(osmoData.metrics.volume_24h, 0) + ' $\n24h: ' + getFloatPrefix(vol24h) + formatFloat(Math.abs(vol24h), 1) + ' $ <code>(' + getFloatTextSymbol(osmoData.metrics.volume_24h_change) + Math.abs(osmoData.metrics.volume_24h_change).toFixed(1) + '%)</code>'
                text = text + `\n\nIBC status:\nTotal active IBC channels: ${osmoChannels.length}\n${getIBCstatusEmoji(congestedChannels)} Congested IBC channels: ${congestedChannels.length}`
                if (congestedChannels.length > 0) { text = text + '\n' + emoji.fingerShow + ' send /ibc for more details' }
                text = text + `\n\nStaked OSMO: ${formatFloat(stakingData.bondedRatio, 1)} %\nTotal active validators: ${stakingData.numBondedValidators}
Staking APR: ${formatFloat(osmoData.apr_staking, 1)} %\nStaking APY: ${formatFloat(aprApy(osmoData.apr_staking), 1)} %\n\n${emoji.fingerShow} like this bot? <a href="${config.ccStakeWithUsUrl }">Stake with CryptoCrew</a>
${emoji.restake} like APY? <a href="https://restake.app">Compound your rewards with REstake.app</a>`;
            }
            break;
        }
        case '/ibc': {
            if (osmoData) {
                let osmoChannels = getOsmoIBCchannels(osmoData.ibc);
                let congestedChannels = getCongestedIBCchannels(osmoChannels);
                text = `${emoji.atom}<b> IBC status - <a href="` + config.osmoLink + `">osmosis.zone</a></b>\n\nTotal active IBC channels: ${osmoChannels.length}\n${getIBCstatusEmoji(congestedChannels)} Congested IBC channels: ${congestedChannels.length}`
                if (congestedChannels.length > 0) {
                    text = text + '\n\n' + getCongestedChannelString(congestedChannels) + '\n';
                }
                text = text + emoji.fingerShow + ' <a href="https://www.mintscan.io/osmosis/relayers">Relayer data on Mintscan</a>';
            }
            break;
        }
        case '/tokens': case '/assets': {
            if (osmoData) {
                text = `${emoji.ion}<b> Tokens - <a href="` + config.osmoLink + `">osmosis.zone</a></b>\n\nTotal tokens: ${osmoData.tokens.length}\n\n`;
                text = text + getTokenOverviewString(osmoData.tokens) + `\n\nsend /tokenname for more details`;
            }
            break;
        }
        case '/pool': {
            if (osmoData) {
                if (params[0]) {
                    let pool = getPool(osmoData.pools, params[0]);
                    if (pool) {
                        if (pool[0].main == true) {
                            text = `${emoji.testTube}<b>  <a href="` + config.osmoLink + `/pool/` + pool.id + `">Pool ${pool.id} - osmosis.zone</a></b>`
                        }
                        else if (pool[0].main == false) {
                            text = `${emoji.testTube}<b>  <a href="https://frontier.osmosis.zone/pool/` + pool.id + `">Pool ${pool.id} - osmosis.zone</a></b>`
                        }
                        text = text + '\n<b>' + getPoolTokenOverview(pool) + '</b>\n\n' + getPoolTokenInfos(pool, osmoData.apr_all);
                    }
                    else {
                        text = `sorry, cant find pool ${params[0]}`
                    }
                }
                else {
                    text = 'no pool ID specified. use: "/pool ID"';
                }
            }
            break;
        }
        case '/apr': case '/rewards': {
            if (osmoData, stakingData) {
                text = `${emoji.starDust}<b> Rewards - <a href="` + config.osmoLink + `">osmosis.zone</a></b>`;
                text = text + '\n\nStaking APR: ' + formatFloat(osmoData.apr_staking, 1) + ' %\nStaking APY: ' + formatFloat(aprApy(osmoData.apr_staking), 1) + ' %';
                text = text + `\n\n<code>` + getTopRatedPools(osmoData.apr_all,osmoData.pools) + `</code>`;
            }
            break;
        }
        case '/aprtoapy': {
            if (params[0]) {
                let apy = aprApy(params[0]);
                if (apy) {
                    if (params[0].toString().includes('%')) {
                        text = params[0] + " APR = " + apy.toFixed(1).toString() + " % APY";
                    }
                    else {
                        text = params[0] + " % APR = " + apy.toFixed(1).toString() + " % APY";
                    }
                }
                else text = "sorry, can't calculate APY for value: " + params[0];
            }
            else text = "no APR value provided! usage: /aprtoapy value_apr";
            break;
        }
    }
    return text;
}

async function generateSupportCommandAnswer(msg) {
    let supportCommands = await cacheGet("sp");
    let pic = "";
    let text = "";
    let httpOptions = {
        "disable_web_page_preview": true,
        "parse_mode": "HTML"
    };
    if (supportCommands) {
        supportCommands.forEach((command) => {
            if (msg.text == command.command.toLowerCase()) {
                text = command.text;
                if (command.pic) {
                    httpOptions.caption = text;
                    if (command.pic.includes('/file/d/')) {
                        command.pic = 'https://docs.google.com/uc?id=' + command.pic.split('/file/d/')[1];
                        if (command.pic.includes('/view?usp=sharing')) {
                            command.pic = command.pic.replace('/view?usp=sharing', '');
                        }
                    }
                    pic = command.pic;
                }
                else {
                    if (text.includes(' osmosis.zone ')) {
                        httpOptions.disable_web_page_preview = true;
                    }
                    else {
                        httpOptions.disable_web_page_preview = false;
                    }
                }
            }
        });
        return {
            "text": text,
            "pic": pic,
            "tgOptions": httpOptions
        };
    }
    return {
        "text": "",
        "pic": "",
        "tgOptions": httpOptions
    };
}

function generateAssetCommandAnswer(msg, osmoData) {
    let symbol = msg.text.slice(1).toLowerCase();
    if (symbol.includes('_')) {
        symbol = symbol.replace('_','.')
    }
    let text = "";
    osmoData.tokens.forEach((token) => {
        if (token.symbol.toLowerCase() == symbol) {
            text = text = `${emoji.link}<b> ${token.symbol} </b> - ${token.name}\n\n`
            if (token.price >= 0.1) {
                text = text + `Last Price: ${formatFloat(token.price, 2)}`
            }
            else {
                text = text + `Last Price: ${token.price}`
            }
            text = text + ` $ <code>(${getFloatTextSymbol(token.price_24h_change)}` + formatFloat(Math.abs(token.price_24h_change), 1) + ` %)</code >
Liquidity: ${formatFloat(token.liquidity, 1)} $
Volume 24h: ${formatFloat(token.volume_24h, 1)} $ <code>(${getFloatTextSymbol(token.volume_24h_change)}` + formatFloat(Math.abs(token.volume_24h_change), 1) + ` %)</code>`
        }
    });
    return text;
}

async function generateBlacklistAnswer() {
    let blacklist = await fsReadBlacklist();
    let text = 'global_ban blacklist:\n\n';
    let t = new Table;
    blacklist.blacklist.forEach((user) => {
        t.cell('id', '</code><a href="tg://user?id=' + user.id + '">' + user.id + '</a><code>');
        t.cell('name', user.username);
        t.cell('1st', user.first_name);
        t.cell('2nd', user.first_name);
        t.cell('by', user.by);
        t.newRow();
    });
    text = text + '<code> ' + t.print() + '</code>\nsend <code>!unban $user_id</code> to unban';
    return text;
}

export {
    generateBotCommandAnswer,
    generateAssetCommandAnswer,
    generateSupportCommandAnswer,
    generateBlacklistAnswer
}