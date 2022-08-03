const creds = require('./creds.json');
const { gDoc } = require('./clients.js');

async function sheetReadRows() {
    await gDoc.useServiceAccountAuth(creds);
    await gDoc.loadInfo();
    let sheet = gDoc.sheetsByIndex[0];
    let rows = await sheet.getRows();
    return rows;
}

async function sheetFetchSupportCommands() {
    let rows = await sheetReadRows();
    var supportCommands = [];
    rows.forEach((row) => {
        if (row.active == 'TRUE') {
            supportCommands.push({
                command: row.command,
                active: row.active,
                text: row.text,
                pic: row.pic_link,
            })
        }
    });
    return supportCommands;
}

module.exports = { sheetFetchSupportCommands }