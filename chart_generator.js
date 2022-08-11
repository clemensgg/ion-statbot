import config from '../config.js'
import puppeteer from 'puppeteer';

async function generateChart(input) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    let html = `<!doctype html>

<html lang="en">
<head><meta charset="utf-8"></head>

<body>
  <script src="js/scripts.js"></script>
</body>
</html>`
    await page.setContent(html);

    const content = await page.$("body");
    const imageBuffer = await content.screenshot({ omitBackground: true });

    await page.close();
    await browser.close();

    return imageBuffer;
}

export {
    generateChart
}