import puppeteer from 'puppeteer';
import fs from 'fs/promises';

async function generateChart(input) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const chartoptions = {
        grid: {
            vertLines: { visible: false },
            horzLines: { visible: false }
        },
        layout: {
            textColor: "white",
            background: { type: "solid", color: "#2d2755" },
            fontSize: 12,
            fontFamily: 'sans-serif',
            rightPriceScale: {
                // scaleMargins: { bottom: 1, top: 1 }
            },
            timeScale: {
                rightOffset: 10,
            },
            localization: {
                priceFormatter: {
                    type: "custom",
                    minMove: 0.01
                },
                // dateFormat: "yyyy, yy, MMMM, MMM, MM and dd"
            }
        },
        series: {

        },
        width: 600,
        height: 400
    }

    let html = `<!doctype html>
<html lang="en">
<head>
<script src="https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>
<style>
	body {
		background-color: #231d4b;"
	}
	div.tv-lightweight-charts {
		margin-top: 20px;
        margin-left: 20px;
        margin-right: 20px;
        margin-bottom: 20px;
		border-radius: 10px;
		background-color: #2d2755;
	}
	table {
		padding: 10px 10px 10px 10px;
	}
</style>
</head>
<body>
<script>
        const chart = LightweightCharts.createChart(document.body, ${JSON.stringify(chartoptions)});
        const candlestickSeries = chart.addCandlestickSeries();
        candlestickSeries.setData(${JSON.stringify(input)});
        chart.timeScale().fitContent();
</script>
</body>
</html>`
    await page.setContent(html);
    await page.setViewport({ width: 860, height: 680 })

    const content = await page.$("body");
    const imageBuffer = await content.screenshot({ omitBackground: true });

    await page.close();
    await browser.close();

    await saveFile(imageBuffer);
    return imageBuffer;
}

async function saveFile(data) {
    let filename = "C:/testdb/ionbot/test.jpg";
    await fs.writeFile(filename, data, "binary", (err) => {
        if (!err) {
            console.log(`${filename} created successfully!`);
            return true;
        }
    });
    return false;
}

export {
    generateChart
}
