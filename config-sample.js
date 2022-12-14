export default {
  "appEndpoint": "https://your-app-endpoint-behind-ssl",
  "sslcert": "/home/ubuntu/.ionbot/certs/cert.pem",
  "blacklistFileUrl": "/home/ubuntu/.ionbot/blacklist/blacklist.json",
  "blacklistSourceChat": 0,
  "osmoMainGroup": 0,
  "osmoLCDurl": "https://rest-osmosis.ecostake.com",
  "imperatorUrl": "https://api-osmosis.imperator.co",
  "pollInterval": 60,
  "autodeleteTimeout": 20,
  "tgBotToken": "your-telegram-bot-token",
  "tgUrl": "https://api.telegram.org/bot/",
  "googleSheetID": "your-google-sheet-id",
  "joinControl": {
    "active": true,
    "timeout": 30,
    "groups": []
  },
  "supportCommandsActive": true,
  "activeCommands": [
    "/start",
    "/help",
    "/commands",
    "/info",
    "/osmosis",
    "/assets",
    "/tokens",
    "/pool",
    "/apr",
    "/staking",
    "/ibc",
    "/echoGroupID",
    "/aprtoapy"
  ],
  "stickers": {
    "dmwarningblue": "CAACAgQAAxkBAAEDFLFhaH4qXKfCSxLLBl9nMD71fncsRAACXQgAAjOrYVABqmskQq27MyEE",
    "dmwarningred": "CAACAgQAAxkBAAEDFLVhaH4zBO02uU8RZPCBQXNIrZxqVgACsgkAAlPtYVCZU3mrzY2NTiEE",
    "nevershareyourseedphrase": "CAACAgQAAxkBAAEDFLdhaH42PGmSJTCXDIKbnLWwRC_30QACEgADLvM6Enm-dSWWrjKCIQQ",
    "randommessagesarescam": "CAACAgQAAxkBAAEDFLNhaH4upDLsLTXKPGa6Ptvs_vbWTQACFAADLvM6EtLt6FP2kKiDIQQ"
  },
  "ccStakeWithUsUrl": "https://ccvalidators.com",
  "osmoLink": "https://app.osmosis.zone"
}