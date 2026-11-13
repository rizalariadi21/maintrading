// api/stock.js - Vercel Serverless Function to fetch Yahoo Finance without CORS issues
export default async function handler(req, res) {
  // Enable CORS for client requests
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { symbol, symbols, range = '1d', interval = '15m' } = req.query;
  const targetSymbols = symbols ? symbols.split(',') : symbol ? [symbol] : ['BBCA.JK', 'BRIS.JK', 'AMMN.JK', '^JKSE'];

  try {
    const results = {};

    await Promise.all(
      targetSymbols.map(async (sym) => {
        const cleanSym = sym.trim();
        if (!cleanSym) return;

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSym)}?interval=${interval}&range=${range}`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ${cleanSym}: HTTP ${response.status}`);
        }

        const data = await response.json();
        const resData = data?.chart?.result?.[0];
        if (!resData) return;

        const meta = resData.meta || {};
        const currentPrice = meta.regularMarketPrice ?? meta.chartPreviousClose ?? 0;
        const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? currentPrice;
        const change = currentPrice - prevClose;
        const changePercent = prevClose ? (change / prevClose) * 100 : 0;

        // Extract historical points for chart
        const timestamps = resData.timestamps || resData.timestamp || [];
        const quotes = resData.indicators?.quote?.[0] || {};
        const closes = quotes.close || [];
        const opens = quotes.open || [];
        const highs = quotes.high || [];
        const lows = quotes.low || [];

        const chartData = [];
        for (let i = 0; i < timestamps.length; i++) {
          if (closes[i] !== null && closes[i] !== undefined) {
            chartData.push({
              time: timestamps[i],
              open: opens[i] ?? closes[i],
              high: highs[i] ?? closes[i],
              low: lows[i] ?? closes[i],
              close: closes[i]
            });
          }
        }

        results[cleanSym] = {
          symbol: cleanSym,
          currency: meta.currency || 'IDR',
          price: currentPrice,
          previousClose: prevClose,
          change: change,
          changePercent: changePercent,
          high: meta.regularMarketDayHigh ?? Math.max(...chartData.map(c => c.high), currentPrice),
          low: meta.regularMarketDayLow ?? Math.min(...chartData.map(c => c.low), currentPrice),
          volume: meta.regularMarketVolume || 0,
          timestamp: meta.regularMarketTime || Math.floor(Date.now() / 1000),
          chart: chartData
        };
      })
    );

    // Cache on Vercel CDN for 10 seconds to avoid spamming Yahoo Finance
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error('Error in /api/stock:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
