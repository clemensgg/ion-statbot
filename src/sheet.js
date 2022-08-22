import creds from '../creds.js';
import { gDoc } from './clients.js';

async function sheetReadCommands() {
    await gDoc.useServiceAccountAuth(creds);
    await gDoc.loadInfo();
    let sheet = gDoc.sheetsByIndex[0];
    let rows = await sheet.getRows();
    return rows;
}

async function sheetFetchSupportCommands() {
    let rows = await sheetReadCommands();
    var supportCommands = [];
    rows.forEach((command) => {
        if (command.active == 'TRUE') {
            supportCommands.push({
                command: command.command.toLowerCase(),
                active: command.active,
                text: command.text,
                pic: command.pic_link,
            })
        }
    });
    return supportCommands;
}

async function sheetWriteBlacklistUsers(blusers) {
    await gDoc.useServiceAccountAuth(creds);
    await gDoc.loadInfo();
    let sheetUsers = gDoc.sheetsByIndex[1];
    await sheetUsers.clear();
    let keys = ['id, username, first_name, last_name, by, src, ts'];
    if (blusers.length > 0) {
        keys = Object.keys(blusers[0]);
        await sheetUsers.setHeaderRow(keys);
        await sheetUsers.addRows(blusers);
    }
    return true;
}

async function sheetWriteBlacklistChats(blchats) {
    await gDoc.useServiceAccountAuth(creds);
    await gDoc.loadInfo();
    let sheetChats = gDoc.sheetsByIndex[2];
    await sheetChats.clear();
    let keys = ['id, adm, n'];
    if (blchats.length > 0) {
        keys = Object.keys(blchats[0]);
        await sheetChats.setHeaderRow(keys);
        await sheetChats.addRows(blchats);
    }
    return true;
}

export {
    sheetWriteBlacklistUsers,
    sheetWriteBlacklistChats,
    sheetFetchSupportCommands
}