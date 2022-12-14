# ion-statbot
Telegram statistics and 2-step doorbell captcha bot for :test_tube: [osmosis.zone](https://osmosis.zone) by :white_check_mark: [CryptoCrew Validators](https://ccvalidators.com)

admin: `@clemensg` (telegram)

## datasources: 
- [Imperator Osmosis REST API](https://api-osmosis.imperator.co)
- Osmosis LCD [osmojs](https://github.com/osmosis-labs/osmojs)
- [Coingecko API](https://www.coingecko.com/en/api/documentation)

## commands:
`active`
|  command					            | description                                   |
| ------------------------------------- | --------------------------------------------- |
`/start /help /commands /info`			| print bot info & commands						|
`/osmosis`								| print osmosis.zone total statistics			|
`/ibc`									| print ibc channel status (congested channels)	|
`/assets /tokens`						| print all supported assets					|
`/$symbol (i.e. /osmo or /atom)`		| print asset statstics							|
`/pool $pool_number`					| print pool statistics							|
`/apr`									| list highest apr pools & staking apr			|
`/staking`								| pring staking statistics						|
`/aprtoapy $apr`						| calculate APY for given APR					|
`/chart $type $symbol/$pool $timeframe` | charttypes: price, pool, osmosis				|

`feature requests:`
|  command							    | description                                   |
| ------------------------------------- | --------------------------------------------- |
`/validators`							| print validator stats							|
`/validator $moniker/valoperadd`		| print validator stats for specific validator	|

## admin supportcommands
`#commands` are restricted to admins and are organized on a dedicated google sheet by osmosis.zone staff.

## doorbell
prompts new users to solve a 2-step auth to prevent as many bots as possible (numerical equasion captcha + button answer `NO`).
whitelist chats and control doorbell via config.json

## global blacklist
admins of ONE whitelisted chat can ban users globally (from all other chats the bot is admin in) using `!globalban`