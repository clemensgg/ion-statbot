import config from '../config.js'
import puppeteer from 'puppeteer';

async function generateChart(input) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({
        height: 1920,
        width: 1440
    });
}

export {
    generateChart
}