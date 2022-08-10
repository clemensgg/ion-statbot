import puppeteer from 'puppeteer';

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
                scaleMargins: { bottom: 0.2, top: 0.3 }
            },
            timeScale: {
                rightOffset: 10,
                scaleMargins: { bottom: 0.2, top: 0.3 }
            },
            localization: {
                priceFormatter: {
                    type: "custom",
                    minMove: 0.01
                },
                // dateFormat: "yyyy, yy, MMMM, MMM, MM and dd"
            }
        },
        width: 800,
        height: 600
    }

    let html = `<!doctype html>
<html lang="en">
<head>
<script src="https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>
</head>
<body>
<script>
const chartOptions = ${JSON.stringify(chartoptions)};
const chart = LightweightCharts.createChart(document.body, chartOptions);
const candlestickSeries = chart.addCandlestickSeries();
candlestickSeries.setData(${JSON.stringify(input)});

chart.timeScale().fitContent();
</script>
</body>
</html>`
    await page.setContent(html);
    await page.setViewport({ width: 800, height: 600 })

    const content = await page.$("body");
    const imageBuffer = await content.screenshot({ omitBackground: true });

    await page.close();
    await browser.close();

    return imageBuffer;
}

export {
    generateChart
}

/*
 * 
*/