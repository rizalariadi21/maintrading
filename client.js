/**
 * SimuTrade ID - Main Application Logic
 * Pure Vanilla JavaScript & LocalStorage Engine
 */

// ==========================================
// 1. CONFIGURATION & ASSET DEFINITIONS
// ==========================================
const ASSETS_CONFIG = {
  // Crypto Assets (Institutional Feed matching TradingView 1:1)
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    category: 'CRYPTO',
    yahooSymbol: 'BTC-USD',
    desc: 'Mata uang kripto terbesar dan pelopor terdesentralisasi',
    iconColor: '#f7931a',
    unit: 'BTC',
    defaultPrice: 68900 * 15850,
    minQty: 0.0001
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    category: 'CRYPTO',
    yahooSymbol: 'ETH-USD',
    desc: 'Platform smart contract dan ekosistem Web3 terbesar',
    iconColor: '#627eea',
    unit: 'ETH',
    defaultPrice: 1950 * 15850,
    minQty: 0.001
  },
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    category: 'CRYPTO',
    yahooSymbol: 'SOL-USD',
    desc: 'Blockchain berkecepatan tinggi dengan biaya transaksi super murah',
    iconColor: '#14f195',
    unit: 'SOL',
    defaultPrice: 81 * 15850,
    minQty: 0.01
  },
  PAXG: {
    symbol: 'PAXG',
    name: 'PAX Gold (Emas)',
    category: 'CRYPTO',
    yahooSymbol: 'PAXG-USD',
    desc: 'Aset kripto beragun emas fisik murni (1 PAXG = 1 troy oz emas)',
    iconColor: '#d4af37',
    unit: 'PAXG',
    defaultPrice: 3880 * 15850,
    minQty: 0.001
  },

  // Indonesian Stocks (IDX)
  'BBCA.JK': {
    symbol: 'BBCA.JK',
    shortSymbol: 'BBCA',
    name: 'Bank Central Asia',
    category: 'STOCK',
    yahooSymbol: 'BBCA.JK',
    desc: 'Bank swasta terbesar di Indonesia dengan kapitalisasi pasar nomor 1',
    iconColor: '#005baa',
    unit: 'Lot',
    defaultPrice: 9850,
    minQty: 1
  },
  'BRIS.JK': {
    symbol: 'BRIS.JK',
    shortSymbol: 'BRIS',
    name: 'Bank Syariah Indonesia',
    category: 'STOCK',
    yahooSymbol: 'BRIS.JK',
    desc: 'Bank syariah terbesar di Indonesia milik BUMN Himbara',
    iconColor: '#00a39d',
    unit: 'Lot',
    defaultPrice: 2850,
    minQty: 1
  },
  'AMMN.JK': {
    symbol: 'AMMN.JK',
    shortSymbol: 'AMMN',
    name: 'Amman Mineral',
    category: 'STOCK',
    yahooSymbol: 'AMMN.JK',
    desc: 'Perusahaan tambang tembaga & emas raksasa di Pulau Sumbawa',
    iconColor: '#c99200',
    unit: 'Lot',
    defaultPrice: 9200,
    minQty: 1
  }
};

const IHSG_SYMBOL = '^JKSE';
const STORAGE_KEY = 'simutrade_id_storage_v1';
const INITIAL_CAPITAL = 100000000; // 100 Juta Rupiah

// Fee Rates
const FEE_STOCK_BUY = 0.0015;  // 0.15%
const FEE_STOCK_SELL = 0.0025; // 0.25%
const FEE_CRYPTO = 0.0010;     // 0.10%

// ==========================================
// 2. STATE MANAGEMENT & LOCAL STORAGE
// ==========================================
let appState = {
  cash: INITIAL_CAPITAL,
  portfolio: {}, // symbol -> { symbol, name, category, qty, lots, avgPrice, totalInvested }
  history: [],   // list of transactions
  selectedAsset: 'BTC',
  orderType: 'BUY', // 'BUY' or 'SELL'
  cryptoInputMode: 'IDR', // 'IDR' or 'COIN'
  currentFilter: 'all',
  chartType: 'candlestick', // 'candlestick' or 'line'
  currentTimeframe: '1h',   // '1h', '4h', '1d', '1w', '1y'
  currency: 'IDR',          // 'IDR' or 'USD'
  showMacd: false           // MACD indicator toggle
};

// Market data cache: symbol -> { price, change24h, change24hPct, high, low, prevClose, lastUpdated }
let marketData = {};
let usdIdrRate = 15850;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      appState.cash = typeof parsed.cash === 'number' ? parsed.cash : INITIAL_CAPITAL;
      appState.portfolio = parsed.portfolio || {};
      appState.history = parsed.history || [];
      appState.currency = parsed.currency || 'IDR';
      appState.showMacd = Boolean(parsed.showMacd);
      appState.currentTimeframe = parsed.currentTimeframe || '1h';
    }
  } catch (err) {
    console.error('Error loading state from localStorage:', err);
    resetToInitial();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      cash: appState.cash,
      portfolio: appState.portfolio,
      history: appState.history,
      currency: appState.currency,
      showMacd: appState.showMacd,
      currentTimeframe: appState.currentTimeframe
    }));
  } catch (err) {
    console.error('Error saving state to localStorage:', err);
  }
}

function resetToInitial() {
  appState.cash = INITIAL_CAPITAL;
  appState.portfolio = {};
  appState.history = [];
  saveState();
  updateUI();
  updateCurrencySelectorUI();
  showToast(appState.currency === 'USD' ? 'Balance reset to $6,309.15 (Rp 100 Juta)!' : 'Modal berhasil di-reset ke Rp 100.000.000!', 'success');
  playAudioChime('chime');
}

// ==========================================
// 3. SOUND SYNTHESIZER (WEB AUDIO API)
// ==========================================
let audioCtx = null;
function playAudioChime(type = 'buy') {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'buy') {
      // Ascending chord (C5 -> E5 -> G5)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.18);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'sell') {
      // Cash register pleasant chime (G5 -> C6)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(783.99, now);
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'error') {
      // Soft low alert
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'chime') {
      // Reset bell
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch (e) {
    // Ignore audio autoplay restrictions
  }
}

// ==========================================
// 4. CHART ENGINE (LIGHTWEIGHT CHARTS - OHLC CANDLESTICKS & LINE)
// ==========================================
let chartInstance = null;
let activeSeries = null;
let currentChartData = []; // [{ time, open, high, low, close }]

// MACD Indicator series & state
let macdChartInstance = null;
let macdHistSeries = null;
let macdLineSeries = null;
let macdSignalSeries = null;

// Synchronized data lookups & sync states
let currentMacdMap = new Map();
let currentCandleMap = new Map();
let latestMacdValues = { macd: null, signal: null, hist: null };

let isSyncingRange1 = false;
let isSyncingRange2 = false;
let boundMainRangeHandler = null;
let boundMacdRangeHandler = null;

let isCrosshairSyncing = false;
let boundMainCrosshairHandler = null;
let boundMacdCrosshairHandler = null;

function initChart() {
  const container = document.getElementById('tv-chart-container');
  if (!container || !window.LightweightCharts) return;

  container.innerHTML = '';

  chartInstance = LightweightCharts.createChart(container, {
    layout: {
      background: { color: '#070a0f' },
      textColor: '#94a3b8',
      fontSize: 11,
      fontFamily: "'JetBrains Mono', monospace"
    },
    grid: {
      vertLines: { color: 'rgba(32, 43, 61, 0.35)' },
      horzLines: { color: 'rgba(32, 43, 61, 0.35)' }
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
      vertLine: { color: '#38bdf8', width: 1, style: 2 },
      horzLine: { color: '#38bdf8', width: 1, style: 2 }
    },
    rightPriceScale: {
      borderColor: '#202b3d',
      scaleMargins: { top: 0.12, bottom: 0.12 },
      minimumWidth: 85
    },
    timeScale: {
      borderColor: '#202b3d',
      timeVisible: true,
      secondsVisible: false
    }
  });

  // Default crosshair move listener to update OHLC live preview header (active when not in 2-chart sync)
  chartInstance.subscribeCrosshairMove((param) => {
    if (appState.showMacd && boundMainCrosshairHandler) return;
    if (!param || !param.time || !param.seriesData) {
      if (currentChartData.length > 0) {
        updateOhlcDisplay(currentChartData[currentChartData.length - 1], false);
      }
      return;
    }
    const data = param.seriesData.get(activeSeries);
    if (data) {
      updateOhlcDisplay(data, true);
    }
  });

  // Responsive resize
  window.addEventListener('resize', () => {
    if (chartInstance && container) {
      chartInstance.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight
      });
    }
  });

  createSeriesInstance();
}

function createSeriesInstance() {
  if (activeSeries && chartInstance) {
    try {
      chartInstance.removeSeries(activeSeries);
    } catch (e) {}
  }

  if (appState.chartType === 'candlestick') {
    activeSeries = chartInstance.addCandlestickSeries({
      upColor: '#00c076',
      downColor: '#ff3b69',
      borderVisible: false,
      wickUpColor: '#00c076',
      wickDownColor: '#ff3b69'
    });
  } else {
    activeSeries = chartInstance.addAreaSeries({
      topColor: 'rgba(0, 192, 118, 0.4)',
      bottomColor: 'rgba(0, 192, 118, 0.01)',
      lineColor: '#00c076',
      lineWidth: 2
    });
  }
}

function updateOhlcDisplay(candle, isAlreadyScaled = false) {
  const oEl = document.getElementById('ohlc-o');
  const hEl = document.getElementById('ohlc-h');
  const lEl = document.getElementById('ohlc-l');
  const cEl = document.getElementById('ohlc-c');
  if (!candle) return;

  const open = candle.open ?? candle.value ?? 0;
  const high = candle.high ?? candle.value ?? 0;
  const low = candle.low ?? candle.value ?? 0;
  const close = candle.close ?? candle.value ?? 0;

  if (isAlreadyScaled && appState.currency === 'USD') {
    const fmt = (v) => {
      const abs = Math.abs(v);
      const dec = abs >= 100 ? 2 : abs >= 1 ? 2 : 4;
      return '$' + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    };
    if (oEl) oEl.textContent = fmt(open);
    if (hEl) hEl.textContent = fmt(high);
    if (lEl) lEl.textContent = fmt(low);
    if (cEl) cEl.textContent = fmt(close);
  } else {
    if (oEl) oEl.textContent = formatCurrency(open);
    if (hEl) hEl.textContent = formatCurrency(high);
    if (lEl) lEl.textContent = formatCurrency(low);
    if (cEl) cEl.textContent = formatCurrency(close);
  }
}

// Fetch historical candles based on symbol & timeframe
async function fetchHistoricalCandles(symbol, tf) {
  const asset = ASSETS_CONFIG[symbol];
  const querySymbol = asset?.yahooSymbol || symbol;
  const isCrypto = asset.category === 'CRYPTO';
  const currentPrice = marketData[symbol]?.price || asset?.defaultPrice || 1000;
  const prevClose = marketData[symbol]?.prevClose || currentPrice * 0.98;

  let range = '1d';
  let interval = '5m';

  if (tf === '1m') {
    range = '1d';
    interval = '1m';
  } else if (tf === '5m') {
    range = '1d';
    interval = '5m';
  } else if (tf === '15m') {
    range = '5d';
    interval = '15m';
  } else if (tf === '30m') {
    range = '1mo';
    interval = '30m';
  } else if (tf === '1h') {
    range = '1mo';
    interval = '1h';
  } else if (tf === '4h') {
    range = '3mo';
    interval = '1h'; // 1h candles aggregated to 4-hour candles below
  } else if (tf === '1d') {
    range = '1y';
    interval = '1d';
  } else if (tf === '1w') {
    range = '2y';
    interval = '1wk';
  } else if (tf === '1mo') {
    range = '5y';
    interval = '1mo';
  } else if (tf === '1y') {
    range = '5y';
    interval = '1mo';
  }

  try {
    const res = await fetch(`/api/stock?symbol=${encodeURIComponent(querySymbol)}&range=${range}&interval=${interval}`);
    if (res.ok) {
      const json = await res.json();
      const stockData = json?.data?.[querySymbol];
      if (stockData?.chart && stockData.chart.length > 0) {
        let rawCandles = stockData.chart
          .filter(c => c.time && c.open && c.high && c.low && c.close)
          .sort((a, b) => a.time - b.time);

        // Aggregate 1h candles to true 4h candles if timeframe is 4h
        if (tf === '4h' && rawCandles.length > 0) {
          const aggregated = [];
          let currentBlock = [];
          let blockStart = 0;

          for (const c of rawCandles) {
            const cBlock = Math.floor(c.time / 14400) * 14400;
            if (blockStart === 0 || cBlock === blockStart) {
              currentBlock.push(c);
              blockStart = cBlock;
            } else {
              if (currentBlock.length > 0) {
                aggregated.push({
                  time: blockStart,
                  open: currentBlock[0].open,
                  high: Math.max(...currentBlock.map(x => x.high)),
                  low: Math.min(...currentBlock.map(x => x.low)),
                  close: currentBlock[currentBlock.length - 1].close
                });
              }
              currentBlock = [c];
              blockStart = cBlock;
            }
          }
          if (currentBlock.length > 0) {
            aggregated.push({
              time: blockStart,
              open: currentBlock[0].open,
              high: Math.max(...currentBlock.map(x => x.high)),
              low: Math.min(...currentBlock.map(x => x.low)),
              close: currentBlock[currentBlock.length - 1].close
            });
          }
          rawCandles = aggregated;
        }

        if (rawCandles.length > 0) {
          const uniqueMap = new Map();
          for (const c of rawCandles) {
            if (isCrypto) {
              const rate = usdIdrRate || 15850;
              uniqueMap.set(c.time, {
                time: c.time,
                open: Math.round(c.open * rate),
                high: Math.round(c.high * rate),
                low: Math.round(c.low * rate),
                close: Math.round(c.close * rate)
              });
            } else {
              uniqueMap.set(c.time, {
                time: c.time,
                open: Math.round(c.open),
                high: Math.round(c.high),
                low: Math.round(c.low),
                close: Math.round(c.close)
              });
            }
          }
          return Array.from(uniqueMap.values());
        }
      }
    }
  } catch (e) {
    console.warn('Candle fetch error, using synthetic fallback:', e.message);
  }

  return generateSyntheticCandles(currentPrice, prevClose, tf);
}

function generateSyntheticCandles(currentPrice, prevClose, tf) {
  const points = [];
  const now = Math.floor(Date.now() / 1000);
  let totalCandles = 60;
  let intervalSec = 300; // 5 mins

  if (tf === '1m') {
    totalCandles = 60;
    intervalSec = 60;
  } else if (tf === '5m') {
    totalCandles = 60;
    intervalSec = 300;
  } else if (tf === '15m') {
    totalCandles = 60;
    intervalSec = 900;
  } else if (tf === '30m') {
    totalCandles = 60;
    intervalSec = 1800;
  } else if (tf === '1h') {
    totalCandles = 60;
    intervalSec = 3600;
  } else if (tf === '4h') {
    totalCandles = 60;
    intervalSec = 14400;
  } else if (tf === '1d') {
    totalCandles = 60;
    intervalSec = 86400;
  } else if (tf === '1w') {
    totalCandles = 70;
    intervalSec = 86400 * 7;
  } else if (tf === '1mo') {
    totalCandles = 60;
    intervalSec = 86400 * 30;
  } else if (tf === '1y') {
    totalCandles = 60;
    intervalSec = 86400 * 365;
  }

  const changeTotal = currentPrice - prevClose;
  let prevVal = prevClose;

  for (let i = totalCandles; i >= 0; i--) {
    const t = now - (i * intervalSec);
    const progress = (totalCandles - i) / totalCandles;
    const base = prevClose + (changeTotal * progress);
    const noise = Math.sin(i * 0.5) * (currentPrice * 0.007) + Math.cos(i * 1.1) * (currentPrice * 0.004);
    const targetClose = i === 0 ? currentPrice : Math.max(base + noise, currentPrice * 0.4);

    const open = Math.round(prevVal);
    const close = Math.round(targetClose);
    const high = Math.round(Math.max(open, close) + Math.abs(Math.sin(i * 1.5)) * (currentPrice * 0.004));
    const low = Math.round(Math.min(open, close) - Math.abs(Math.cos(i * 1.5)) * (currentPrice * 0.004));

    points.push({ time: t, open, high, low, close });
    prevVal = close;
  }

  return points;
}

function getScaledCandles(candles) {
  const isUSD = appState.currency === 'USD';
  const rate = (isUSD && usdIdrRate > 0) ? usdIdrRate : 1;
  if (!isUSD) return candles;
  return candles.map(c => ({
    time: c.time,
    open: +(c.open / rate).toFixed(2),
    high: +(c.high / rate).toFixed(2),
    low: +(c.low / rate).toFixed(2),
    close: +(c.close / rate).toFixed(2)
  }));
}

async function renderChartData(symbol) {
  if (!chartInstance) return;
  const loading = document.getElementById('chart-loading-indicator');
  if (loading) loading.classList.remove('hidden');

  const tf = appState.currentTimeframe || '1h';
  const candles = await fetchHistoricalCandles(symbol, tf);
  currentChartData = candles;

  createSeriesInstance();

  const displayCandles = getScaledCandles(currentChartData);

  if (appState.chartType === 'candlestick') {
    activeSeries.setData(displayCandles);
  } else {
    const isUp = (marketData[symbol]?.change24hPct || 0) >= 0;
    activeSeries.applyOptions({
      topColor: isUp ? 'rgba(0, 192, 118, 0.35)' : 'rgba(255, 59, 105, 0.35)',
      bottomColor: isUp ? 'rgba(0, 192, 118, 0.01)' : 'rgba(255, 59, 105, 0.01)',
      lineColor: isUp ? '#00c076' : '#ff3b69'
    });
    activeSeries.setData(displayCandles.map(c => ({ time: c.time, value: c.close })));
  }

  chartInstance.timeScale().fitContent();

  if (currentChartData.length > 0) {
    updateOhlcDisplay(currentChartData[currentChartData.length - 1], false);
  }

  if (appState.showMacd) {
    renderMacdData(displayCandles);
  }

  setTimeout(() => {
    if (loading) loading.classList.add('hidden');
  }, 200);
}

function updateChartCurrentTick(symbol, newPrice) {
  if (!activeSeries || appState.selectedAsset !== symbol || currentChartData.length === 0) return;
  const lastIndex = currentChartData.length - 1;
  const lastCandle = currentChartData[lastIndex];

  lastCandle.close = Math.round(newPrice);
  lastCandle.high = Math.max(lastCandle.high, lastCandle.close);
  lastCandle.low = Math.min(lastCandle.low, lastCandle.close);

  const isUSD = appState.currency === 'USD';
  const rate = (isUSD && usdIdrRate > 0) ? usdIdrRate : 1;

  const tickCandle = {
    time: lastCandle.time,
    open: +(lastCandle.open / rate).toFixed(2),
    high: +(lastCandle.high / rate).toFixed(2),
    low: +(lastCandle.low / rate).toFixed(2),
    close: +(lastCandle.close / rate).toFixed(2)
  };

  if (appState.chartType === 'candlestick') {
    try {
      activeSeries.update(tickCandle);
    } catch (e) {}
  } else {
    try {
      activeSeries.update({ time: tickCandle.time, value: tickCandle.close });
    } catch (e) {}
  }

  updateOhlcDisplay(lastCandle, false);

  if (appState.showMacd && currentChartData.length > 0) {
    renderMacdData(getScaledCandles(currentChartData));
  }
}

function setChartType(type) {
  if (appState.chartType === type) return;
  appState.chartType = type;

  const btnCandle = document.getElementById('chart-type-candle');
  const btnLine = document.getElementById('chart-type-line');

  if (type === 'candlestick') {
    if (btnCandle) btnCandle.className = 'px-2.5 py-1.5 rounded-lg text-white bg-brand-card font-bold flex items-center gap-1.5 transition text-[11px] shadow';
    if (btnLine) btnLine.className = 'px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium flex items-center gap-1.5 transition text-[11px]';
  } else {
    if (btnLine) btnLine.className = 'px-2.5 py-1.5 rounded-lg text-white bg-brand-card font-bold flex items-center gap-1.5 transition text-[11px] shadow';
    if (btnCandle) btnCandle.className = 'px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium flex items-center gap-1.5 transition text-[11px]';
  }

  createSeriesInstance();
  if (currentChartData.length > 0) {
    const displayCandles = getScaledCandles(currentChartData);
    if (type === 'candlestick') {
      activeSeries.setData(displayCandles);
    } else {
      activeSeries.setData(displayCandles.map(c => ({ time: c.time, value: c.close })));
    }
    chartInstance.timeScale().fitContent();
    if (appState.showMacd) {
      renderMacdData(displayCandles);
    }
  }
}

function setTimeframe(tf) {
  appState.currentTimeframe = tf;
  saveState();
  updateTimeframeUI();
  renderChartData(appState.selectedAsset);
}

function updateTimeframeUI() {
  const currentTf = appState.currentTimeframe || '1h';

  // 1. Update quick pills on the chart header bar
  document.querySelectorAll('.chart-tf-btn').forEach(btn => {
    if (btn.dataset.tf === currentTf) {
      btn.className = 'chart-tf-btn px-2 py-1.5 rounded-lg text-white bg-brand-card font-bold transition shadow';
    } else {
      btn.className = 'chart-tf-btn px-2 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium transition';
    }
  });

  // 2. Update dropdown menu items
  document.querySelectorAll('.chart-tf-dropdown-item').forEach(btn => {
    const isSelected = btn.dataset.tf === currentTf;
    if (isSelected) {
      btn.classList.add('bg-brand-card', 'font-bold', 'text-white');
      btn.classList.remove('text-slate-300');
    } else {
      btn.classList.remove('bg-brand-card', 'font-bold', 'text-white');
      btn.classList.add('text-slate-300');
    }
  });

  // 3. Update dropdown badge indicator
  const badge = document.getElementById('active-tf-badge');
  if (badge) {
    const labels = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1D',
      '1w': '1W',
      '1mo': '1M',
      '1y': '1Y'
    };
    badge.textContent = labels[currentTf] || currentTf;
  }
}

// ==========================================
// MACD INDICATOR ENGINE (12, 26, 9)
// ==========================================
function setupChartSync() {
  if (!chartInstance || !macdChartInstance) return;

  const mainTs = chartInstance.timeScale();
  const macdTs = macdChartInstance.timeScale();

  // 1. Time scale bidirectional synchronization
  if (boundMainRangeHandler) {
    try { mainTs.unsubscribeVisibleLogicalRangeChange(boundMainRangeHandler); } catch (e) {}
  }
  if (boundMacdRangeHandler) {
    try { macdTs.unsubscribeVisibleLogicalRangeChange(boundMacdRangeHandler); } catch (e) {}
  }

  boundMainRangeHandler = (range) => {
    if (isSyncingRange2 || !macdChartInstance || !range) return;
    const cur = macdTs.getVisibleLogicalRange();
    if (cur && Math.abs(cur.from - range.from) < 0.005 && Math.abs(cur.to - range.to) < 0.005) {
      return;
    }
    isSyncingRange1 = true;
    macdTs.setVisibleLogicalRange(range);
    isSyncingRange1 = false;
  };

  boundMacdRangeHandler = (range) => {
    if (isSyncingRange1 || !chartInstance || !range) return;
    const cur = mainTs.getVisibleLogicalRange();
    if (cur && Math.abs(cur.from - range.from) < 0.005 && Math.abs(cur.to - range.to) < 0.005) {
      return;
    }
    isSyncingRange2 = true;
    mainTs.setVisibleLogicalRange(range);
    isSyncingRange2 = false;
  };

  mainTs.subscribeVisibleLogicalRangeChange(boundMainRangeHandler);
  macdTs.subscribeVisibleLogicalRangeChange(boundMacdRangeHandler);

  // 2. Crosshair bidirectional synchronization
  if (boundMainCrosshairHandler) {
    try { chartInstance.unsubscribeCrosshairMove(boundMainCrosshairHandler); } catch (e) {}
  }
  if (boundMacdCrosshairHandler) {
    try { macdChartInstance.unsubscribeCrosshairMove(boundMacdCrosshairHandler); } catch (e) {}
  }

  boundMainCrosshairHandler = (param) => {
    if (isCrosshairSyncing) return;

    if (!param || !param.time) {
      if (currentChartData.length > 0) {
        updateOhlcDisplay(currentChartData[currentChartData.length - 1], false);
      }
      if (latestMacdValues.macd !== null) {
        updateMacdLegendValues(latestMacdValues.macd, latestMacdValues.signal, latestMacdValues.hist);
      }
      isCrosshairSyncing = true;
      try {
        if (macdChartInstance) macdChartInstance.clearCrosshairPosition();
      } catch (e) {}
      isCrosshairSyncing = false;
      return;
    }

    const data = param.seriesData.get(activeSeries);
    if (data) {
      updateOhlcDisplay(data, true);
    }

    const mPoint = currentMacdMap.get(param.time);
    if (mPoint) {
      updateMacdLegendValues(mPoint.macd, mPoint.signal, mPoint.hist);
      isCrosshairSyncing = true;
      try {
        if (macdChartInstance && macdLineSeries && typeof mPoint.macd === 'number') {
          macdChartInstance.setCrosshairPosition(mPoint.macd, param.time, macdLineSeries);
        }
      } catch (e) {}
      isCrosshairSyncing = false;
    }
  };

  boundMacdCrosshairHandler = (param) => {
    if (isCrosshairSyncing) return;

    if (!param || !param.time) {
      if (latestMacdValues.macd !== null) {
        updateMacdLegendValues(latestMacdValues.macd, latestMacdValues.signal, latestMacdValues.hist);
      }
      isCrosshairSyncing = true;
      try {
        if (chartInstance) chartInstance.clearCrosshairPosition();
      } catch (e) {}
      isCrosshairSyncing = false;
      return;
    }

    const mPoint = currentMacdMap.get(param.time);
    if (mPoint) {
      updateMacdLegendValues(mPoint.macd, mPoint.signal, mPoint.hist);
    }

    const cPoint = currentCandleMap.get(param.time);
    if (cPoint && activeSeries) {
      updateOhlcDisplay(cPoint, true);
      isCrosshairSyncing = true;
      try {
        if (chartInstance) {
          chartInstance.setCrosshairPosition(cPoint.close ?? cPoint.value, param.time, activeSeries);
        }
      } catch (e) {}
      isCrosshairSyncing = false;
    }
  };

  chartInstance.subscribeCrosshairMove(boundMainCrosshairHandler);
  macdChartInstance.subscribeCrosshairMove(boundMacdCrosshairHandler);
}

function teardownChartSync() {
  if (chartInstance && boundMainRangeHandler) {
    try { chartInstance.timeScale().unsubscribeVisibleLogicalRangeChange(boundMainRangeHandler); } catch (e) {}
    boundMainRangeHandler = null;
  }
  if (chartInstance && boundMainCrosshairHandler) {
    try { chartInstance.unsubscribeCrosshairMove(boundMainCrosshairHandler); } catch (e) {}
    boundMainCrosshairHandler = null;
  }
}

function initMacdChart() {
  const container = document.getElementById('macd-chart-container');
  if (!container || !window.LightweightCharts) return;

  teardownChartSync();

  if (macdChartInstance) {
    try {
      macdChartInstance.remove();
    } catch (e) {}
    macdChartInstance = null;
  }

  container.innerHTML = '';

  macdChartInstance = LightweightCharts.createChart(container, {
    layout: {
      background: { color: '#070a0f' },
      textColor: '#94a3b8',
      fontSize: 10,
      fontFamily: "'JetBrains Mono', monospace"
    },
    grid: {
      vertLines: { color: 'rgba(32, 43, 61, 0.25)' },
      horzLines: { color: 'rgba(32, 43, 61, 0.25)' }
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
      vertLine: { color: '#38bdf8', width: 1, style: 2 },
      horzLine: { color: '#38bdf8', width: 1, style: 2 }
    },
    rightPriceScale: {
      borderColor: '#202b3d',
      scaleMargins: { top: 0.15, bottom: 0.15 },
      minimumWidth: 85
    },
    timeScale: {
      borderColor: '#202b3d',
      timeVisible: true,
      secondsVisible: false
    }
  });

  macdHistSeries = macdChartInstance.addHistogramSeries({
    priceFormat: {
      type: 'price',
      precision: 2,
      minMove: 0.01
    },
    priceScaleId: 'right'
  });

  macdLineSeries = macdChartInstance.addLineSeries({
    color: '#2962ff',
    lineWidth: 1.5,
    priceLineVisible: false,
    lastValueVisible: false,
    priceFormat: {
      type: 'price',
      precision: 2,
      minMove: 0.01
    }
  });

  macdSignalSeries = macdChartInstance.addLineSeries({
    color: '#ff6d00',
    lineWidth: 1.5,
    priceLineVisible: false,
    lastValueVisible: false,
    priceFormat: {
      type: 'price',
      precision: 2,
      minMove: 0.01
    }
  });

  try {
    macdHistSeries.createPriceLine({
      price: 0,
      color: 'rgba(148, 163, 184, 0.25)',
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dotted,
      axisLabelVisible: false
    });
  } catch (e) {}

  setupChartSync();

  window.addEventListener('resize', () => {
    if (macdChartInstance && container) {
      macdChartInstance.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight
      });
    }
  });
}

function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (!data || data.length === 0) return null;
  const kFast = 2 / (fastPeriod + 1);
  const kSlow = 2 / (slowPeriod + 1);
  const kSignal = 2 / (signalPeriod + 1);

  let emaFast = data[0].close;
  let emaSlow = data[0].close;

  const rawMacd = [];
  for (let i = 0; i < data.length; i++) {
    const price = data[i].close;
    emaFast = i === 0 ? price : (price * kFast + emaFast * (1 - kFast));
    emaSlow = i === 0 ? price : (price * kSlow + emaSlow * (1 - kSlow));
    rawMacd.push(emaFast - emaSlow);
  }

  let emaSignal = rawMacd[0];
  const macdLine = [];
  const signalLine = [];
  const histogram = [];

  // Warmup period: wait until EMAs stabilize before plotting values
  const warmup = data.length >= 35 ? Math.min(26, data.length - 5) : Math.min(2, data.length - 1);

  let prevHistVal = 0;

  for (let i = 0; i < data.length; i++) {
    const t = data[i].time;
    const macdVal = rawMacd[i];
    emaSignal = i === 0 ? macdVal : (macdVal * kSignal + emaSignal * (1 - kSignal));
    const sigVal = emaSignal;
    const histVal = macdVal - sigVal;

    if (i < warmup) {
      // Whitespace data: keeps exact 1:1 bar index & time alignment with main chart!
      macdLine.push({ time: t });
      signalLine.push({ time: t });
      histogram.push({ time: t });
    } else {
      const roundedMacd = +macdVal.toFixed(4);
      const roundedSig = +sigVal.toFixed(4);
      const roundedHist = +histVal.toFixed(4);

      // TradingView 4-Color Histogram (Solid vs Faded/Translucent):
      // 1. Above zero & growing (>= prev): Dark Solid Teal (#26a69a)
      // 2. Above zero & falling (< prev): Translucent Teal (rgba(38, 166, 154, 0.45))
      // 3. Below zero & growing negative (<= prev): Dark Solid Red (#ef5350)
      // 4. Below zero & recovering towards 0 (> prev): Translucent Red (rgba(239, 83, 80, 0.45))
      let histColor;
      if (roundedHist >= 0) {
        if (roundedHist >= prevHistVal) {
          histColor = '#26a69a';
        } else {
          histColor = 'rgba(38, 166, 154, 0.45)';
        }
      } else {
        if (roundedHist <= prevHistVal) {
          histColor = '#ef5350';
        } else {
          histColor = 'rgba(239, 83, 80, 0.45)';
        }
      }

      macdLine.push({ time: t, value: roundedMacd });
      signalLine.push({ time: t, value: roundedSig });
      histogram.push({ time: t, value: roundedHist, color: histColor });

      prevHistVal = roundedHist;
    }
  }

  return { macdLine, signalLine, histogram };
}

function renderMacdData(candles) {
  if (!appState.showMacd || !candles || candles.length === 0) return;
  if (!macdChartInstance) {
    initMacdChart();
  }

  const macdResult = calculateMACD(candles);
  if (!macdResult) return;

  currentMacdMap.clear();
  currentCandleMap.clear();

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    currentCandleMap.set(c.time, c);

    const m = macdResult.macdLine[i];
    const s = macdResult.signalLine[i];
    const h = macdResult.histogram[i];

    currentMacdMap.set(c.time, {
      macd: m?.value,
      signal: s?.value,
      hist: h?.value,
      color: h?.color
    });
  }

  macdHistSeries.setData(macdResult.histogram);
  macdLineSeries.setData(macdResult.macdLine);
  macdSignalSeries.setData(macdResult.signalLine);

  // Sync visible logical range directly from main chart without calling fitContent()
  if (chartInstance) {
    const mainRange = chartInstance.timeScale().getVisibleLogicalRange();
    if (mainRange) {
      isSyncingRange1 = true;
      macdChartInstance.timeScale().setVisibleLogicalRange(mainRange);
      isSyncingRange1 = false;
    }
  }

  let lastM = null, lastS = null, lastH = null;
  for (let i = candles.length - 1; i >= 0; i--) {
    const m = macdResult.macdLine[i]?.value;
    const s = macdResult.signalLine[i]?.value;
    const h = macdResult.histogram[i]?.value;
    if (typeof m === 'number' && typeof s === 'number' && typeof h === 'number') {
      lastM = m;
      lastS = s;
      lastH = h;
      break;
    }
  }

  latestMacdValues = { macd: lastM, signal: lastS, hist: lastH };
  updateMacdLegendValues(lastM, lastS, lastH);
}

function updateMacdLegendValues(lineVal, sigVal, histVal) {
  const lineEl = document.getElementById('macd-val-line');
  const sigEl = document.getElementById('macd-val-signal');
  const histEl = document.getElementById('macd-val-hist');

  if (lineEl) lineEl.textContent = typeof lineVal === 'number' ? lineVal.toFixed(2) : '--';
  if (sigEl) sigEl.textContent = typeof sigVal === 'number' ? sigVal.toFixed(2) : '--';
  if (histEl) {
    if (typeof histVal === 'number') {
      histEl.textContent = (histVal >= 0 ? '+' : '') + histVal.toFixed(2);
      if (histVal >= 0) {
        histEl.className = 'text-[#26a69a] font-bold';
      } else {
        histEl.className = 'text-[#ef5350] font-bold';
      }
    } else {
      histEl.textContent = '--';
      histEl.className = 'text-slate-400 font-normal';
    }
  }
}

function toggleMacd(forceShow = null) {
  appState.showMacd = forceShow !== null ? forceShow : !appState.showMacd;
  saveState();

  const wrapper = document.getElementById('macd-pane-wrapper');
  const btn = document.getElementById('btn-toggle-macd');

  if (appState.showMacd) {
    if (wrapper) wrapper.classList.remove('hidden');
    if (btn) {
      btn.className = 'px-2.5 py-1.5 rounded-lg text-sky-400 font-bold flex items-center gap-1.5 transition text-[11px] bg-sky-500/10 border border-sky-500/30 shadow';
    }
    setTimeout(() => {
      initMacdChart();
      const displayCandles = getScaledCandles(currentChartData);
      renderMacdData(displayCandles);
      if (chartInstance) {
        chartInstance.timeScale().fitContent();
        const mainRange = chartInstance.timeScale().getVisibleLogicalRange();
        if (macdChartInstance && mainRange) {
          macdChartInstance.timeScale().setVisibleLogicalRange(mainRange);
        }
      }
    }, 50);
  } else {
    if (wrapper) wrapper.classList.add('hidden');
    if (btn) {
      btn.className = 'px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium flex items-center gap-1.5 transition text-[11px] bg-brand-dark border border-brand-border';
    }
    teardownChartSync();
    if (macdChartInstance) {
      try {
        macdChartInstance.remove();
      } catch (e) {}
      macdChartInstance = null;
    }
  }

  // Trigger resize on main chart
  setTimeout(() => {
    const mainContainer = document.getElementById('tv-chart-container');
    if (chartInstance && mainContainer) {
      chartInstance.applyOptions({
        width: mainContainer.clientWidth,
        height: mainContainer.clientHeight
      });
    }
  }, 100);
}

function setCurrency(curr) {
  if (appState.currency === curr) return;
  appState.currency = curr;
  saveState();
  updateCurrencySelectorUI();
  updateCryptoInputModeUI();
  updateUI();
  renderChartData(appState.selectedAsset);
  showToast(`Mata uang tampilan diubah ke ${curr === 'USD' ? 'US Dollar ($)' : 'Rupiah (Rp)'}`, 'info');
}

function updateCurrencySelectorUI() {
  const btnIdr = document.getElementById('curr-btn-idr');
  const btnUsd = document.getElementById('curr-btn-usd');
  if (appState.currency === 'USD') {
    if (btnUsd) btnUsd.className = 'px-2.5 py-1.5 rounded-lg text-white bg-brand-card font-bold transition flex items-center gap-1.5 shadow text-[11px]';
    if (btnIdr) btnIdr.className = 'px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium transition flex items-center gap-1.5 text-[11px]';
  } else {
    if (btnIdr) btnIdr.className = 'px-2.5 py-1.5 rounded-lg text-white bg-brand-card font-bold transition flex items-center gap-1.5 shadow text-[11px]';
    if (btnUsd) btnUsd.className = 'px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium transition flex items-center gap-1.5 text-[11px]';
  }
}

// ==========================================
// 5. REALTIME DATA FETCHERS
// ==========================================

// ==========================================
// 5. REALTIME DATA FETCHERS (UNIFIED 1:1 TRADINGVIEW & YAHOO FEED)
// ==========================================

const ALL_MARKET_SYMBOLS = [
  'BBCA.JK',
  'BRIS.JK',
  'AMMN.JK',
  IHSG_SYMBOL,
  'BTC-USD',
  'ETH-USD',
  'SOL-USD',
  'PAXG-USD'
];

const CRYPTO_PAIR_MAP = {
  'BTC-USD': 'BTC',
  'ETH-USD': 'ETH',
  'SOL-USD': 'SOL',
  'PAXG-USD': 'PAXG'
};

async function fetchAllMarketPrices() {
  const rate = (usdIdrRate && usdIdrRate > 0) ? usdIdrRate : 15850;

  // 1. Try internal /api/stock first
  try {
    const symParam = encodeURIComponent(ALL_MARKET_SYMBOLS.join(','));
    const res = await fetch(`/api/stock?symbols=${symParam}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        applyUnifiedMarketData(json.data, rate);
        return;
      }
    }
  } catch (e) {
    // Local / fallback
  }

  // 2. Fallback: Query Yahoo Finance via CORS proxy
  for (const sym of ALL_MARKET_SYMBOLS) {
    try {
      const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (meta) {
          const currentPrice = meta.regularMarketPrice ?? meta.chartPreviousClose ?? 0;
          const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? currentPrice;
          const change = currentPrice - prevClose;
          const changePct = prevClose ? (change / prevClose) * 100 : 0;

          const dataObj = {};
          dataObj[sym] = {
            symbol: sym,
            price: currentPrice,
            change: change,
            changePercent: changePct,
            high: meta.regularMarketDayHigh ?? (currentPrice * 1.01),
            low: meta.regularMarketDayLow ?? (currentPrice * 0.99),
            previousClose: prevClose
          };
          applyUnifiedMarketData(dataObj, rate);
        }
      }
    } catch (err) {
      // Keep existing
    }
  }
}

function applyUnifiedMarketData(dataMap, rate) {
  for (const [rawSym, item] of Object.entries(dataMap)) {
    const isCrypto = Boolean(CRYPTO_PAIR_MAP[rawSym]);
    const appSymbol = isCrypto ? CRYPTO_PAIR_MAP[rawSym] : rawSym;
    const oldPrice = marketData[appSymbol]?.price;

    let price = item.price;
    let change = item.change;
    let high = item.high;
    let low = item.low;
    let prevClose = item.previousClose;

    if (isCrypto) {
      // Raw item.price is 1:1 USD from TradingView index
      price = Math.round(item.price * rate);
      change = Math.round(item.change * rate);
      high = Math.round(item.high * rate);
      low = Math.round(item.low * rate);
      prevClose = Math.round(item.previousClose * rate);
    }

    marketData[appSymbol] = {
      price: price,
      rawUSD: isCrypto ? item.price : (price / rate),
      change24h: change,
      change24hPct: item.changePercent,
      high: high,
      low: low,
      prevClose: prevClose,
      lastUpdated: Date.now()
    };

    if (oldPrice && oldPrice !== price) {
      triggerPriceAnimation(appSymbol, price > oldPrice);
      updateChartCurrentTick(appSymbol, price);
    }
  }
}

// Fetch USD/IDR exchange rate
async function fetchExchangeRate() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (res.ok) {
      const data = await res.json();
      if (data?.rates?.IDR) {
        usdIdrRate = Math.round(data.rates.IDR);
        const el = document.getElementById('header-usdidr-rate');
        if (el) el.textContent = formatIDR(usdIdrRate);
      }
    }
  } catch (e) {
    // Keep default
  }
}

// Master Refresh Loop
let countdownSeconds = 5;
async function refreshAllMarketData() {
  const icon = document.getElementById('refresh-icon');
  if (icon) icon.classList.add('animate-spin');

  await fetchAllMarketPrices();

  if (icon) icon.classList.remove('animate-spin');
  updateUI();
}

function startDataLoop() {
  // Initial fetch
  fetchExchangeRate();
  refreshAllMarketData().then(() => {
    renderChartData(appState.selectedAsset);
  });

  // Countdown timer in header
  setInterval(() => {
    countdownSeconds--;
    const timerEl = document.getElementById('countdown-timer');
    if (timerEl) timerEl.textContent = `Update ${countdownSeconds}s`;

    if (countdownSeconds <= 0) {
      countdownSeconds = 5;
      refreshAllMarketData();
    }
  }, 1000);

  // Periodic USD/IDR refresh every 5 mins
  setInterval(fetchExchangeRate, 300000);
}

// Visual animation on price tick
function triggerPriceAnimation(symbol, isUp) {
  const row = document.querySelector(`[data-symbol-row="${symbol}"]`);
  if (row) {
    row.classList.remove('flash-up', 'flash-down');
    void row.offsetWidth; // trigger reflow
    row.classList.add(isUp ? 'flash-up' : 'flash-down');
  }

  if (appState.selectedAsset === symbol) {
    const priceEl = document.getElementById('active-asset-price');
    if (priceEl) {
      priceEl.classList.remove('text-emerald-400', 'text-rose-400');
      priceEl.classList.add(isUp ? 'text-emerald-400' : 'text-rose-400');
      setTimeout(() => {
        priceEl.classList.remove('text-emerald-400', 'text-rose-400');
      }, 1000);
    }
  }
}

// ==========================================
// 6. TRADING EXECUTION ENGINE
// ==========================================
function executeTrade() {
  const symbol = appState.selectedAsset;
  const asset = ASSETS_CONFIG[symbol];
  const currentPrice = marketData[symbol]?.price || asset?.defaultPrice;

  if (!currentPrice || currentPrice <= 0) {
    showToast('Harga pasar belum tersedia, tunggu sebentar...', 'error');
    playAudioChime('error');
    return;
  }

  const isStock = asset.category === 'STOCK';
  const isBuy = appState.orderType === 'BUY';

  if (isStock) {
    // --- SAHAM TRADING LOGIC (LOTS) ---
    const lotInput = document.getElementById('input-stock-lot');
    const lots = parseInt(lotInput?.value || '0', 10);

    if (isNaN(lots) || lots <= 0) {
      showToast('Masukkan jumlah lot yang valid (minimal 1 lot).', 'error');
      playAudioChime('error');
      return;
    }

    const shares = lots * 100;
    const grossTotal = shares * currentPrice;
    const feeRate = isBuy ? FEE_STOCK_BUY : FEE_STOCK_SELL;
    const fee = Math.round(grossTotal * feeRate);

    if (isBuy) {
      const netTotal = grossTotal + fee;
      if (netTotal > appState.cash) {
        showToast('Saldo kas tidak mencukupi untuk membeli lot ini!', 'error');
        playAudioChime('error');
        return;
      }

      // Deduct cash
      appState.cash -= netTotal;

      // Update Portfolio
      const existing = appState.portfolio[symbol] || {
        symbol: symbol,
        name: asset.name,
        category: 'STOCK',
        lots: 0,
        shares: 0,
        avgPrice: 0,
        totalInvested: 0
      };

      const newShares = existing.shares + shares;
      const newTotalInvested = existing.totalInvested + grossTotal; // Cost basis excludes fee
      const newAvgPrice = Math.round(newTotalInvested / newShares);

      appState.portfolio[symbol] = {
        symbol: symbol,
        name: asset.name,
        category: 'STOCK',
        lots: existing.lots + lots,
        shares: newShares,
        avgPrice: newAvgPrice,
        totalInvested: newTotalInvested
      };

      // Record History
      appState.history.unshift({
        id: 'tx-' + Date.now(),
        timestamp: new Date().toISOString(),
        type: 'BUY',
        symbol: asset.shortSymbol || symbol,
        name: asset.name,
        category: 'STOCK',
        qtyDisplay: `${lots} Lot (${formatNumber(shares)} lbr)`,
        price: currentPrice,
        fee: fee,
        total: netTotal,
        realizedPnl: 0
      });

      saveState();
      updateUI();
      playAudioChime('buy');
      showToast(`Sukses Beli ${lots} Lot ${asset.name}!`, 'success');
      lotInput.value = '1';
      calculateOrderEstimates();

    } else {
      // --- SELL STOCK ---
      const owned = appState.portfolio[symbol];
      if (!owned || owned.lots < lots) {
        showToast(`Kamu hanya memiliki ${owned ? owned.lots : 0} lot saham ini!`, 'error');
        playAudioChime('error');
        return;
      }

      const netReceive = grossTotal - fee;
      const soldCostBasis = shares * owned.avgPrice;
      const realizedPnl = Math.round(grossTotal - soldCostBasis - fee);

      appState.cash += netReceive;

      const remainingLots = owned.lots - lots;
      const remainingShares = owned.shares - shares;

      if (remainingLots <= 0) {
        delete appState.portfolio[symbol];
      } else {
        owned.lots = remainingLots;
        owned.shares = remainingShares;
        owned.totalInvested = Math.round(remainingShares * owned.avgPrice);
      }

      // Record History
      appState.history.unshift({
        id: 'tx-' + Date.now(),
        timestamp: new Date().toISOString(),
        type: 'SELL',
        symbol: asset.shortSymbol || symbol,
        name: asset.name,
        category: 'STOCK',
        qtyDisplay: `${lots} Lot (${formatNumber(shares)} lbr)`,
        price: currentPrice,
        fee: fee,
        total: netReceive,
        realizedPnl: realizedPnl
      });

      saveState();
      updateUI();
      playAudioChime('sell');
      showToast(`Sukses Jual ${lots} Lot ${asset.name}! PnL: ${formatIDR(realizedPnl)}`, realizedPnl >= 0 ? 'success' : 'info');
      lotInput.value = '1';
      calculateOrderEstimates();
    }

  } else {
    // --- CRYPTO TRADING LOGIC ---
    const cryptoInput = document.getElementById('input-crypto-amount');
    const inputVal = parseFloat(cryptoInput?.value || '0');

    if (isNaN(inputVal) || inputVal <= 0) {
      showToast('Masukkan nominal atau koin yang valid.', 'error');
      playAudioChime('error');
      return;
    }

    let coinAmount = 0;
    let grossIDR = 0;

    if (appState.cryptoInputMode === 'IDR') {
      grossIDR = appState.currency === 'USD' ? (inputVal * (usdIdrRate || 15850)) : inputVal;
      coinAmount = grossIDR / currentPrice;
    } else {
      coinAmount = inputVal;
      grossIDR = coinAmount * currentPrice;
    }

    const fee = Math.round(grossIDR * FEE_CRYPTO);

    if (isBuy) {
      const netTotal = grossIDR + fee;
      if (netTotal > appState.cash) {
        showToast('Saldo kas tidak cukup untuk transaksi kripto ini!', 'error');
        playAudioChime('error');
        return;
      }

      appState.cash -= netTotal;

      const existing = appState.portfolio[symbol] || {
        symbol: symbol,
        name: asset.name,
        category: 'CRYPTO',
        qty: 0,
        avgPrice: 0,
        totalInvested: 0
      };

      const newQty = existing.qty + coinAmount;
      const newTotalInvested = existing.totalInvested + grossIDR;
      const newAvgPrice = Math.round(newTotalInvested / newQty);

      appState.portfolio[symbol] = {
        symbol: symbol,
        name: asset.name,
        category: 'CRYPTO',
        qty: newQty,
        avgPrice: newAvgPrice,
        totalInvested: newTotalInvested
      };

      appState.history.unshift({
        id: 'tx-' + Date.now(),
        timestamp: new Date().toISOString(),
        type: 'BUY',
        symbol: symbol,
        name: asset.name,
        category: 'CRYPTO',
        qtyDisplay: `${coinAmount.toFixed(6)} ${asset.unit}`,
        price: currentPrice,
        fee: fee,
        total: netTotal,
        realizedPnl: 0
      });

      saveState();
      updateUI();
      playAudioChime('buy');
      showToast(`Sukses Beli ${coinAmount.toFixed(4)} ${asset.unit}!`, 'success');
      cryptoInput.value = '';
      calculateOrderEstimates();

    } else {
      // --- SELL CRYPTO ---
      const owned = appState.portfolio[symbol];
      if (!owned || owned.qty < coinAmount) {
        showToast(`Kamu hanya punya ${owned ? owned.qty.toFixed(6) : 0} ${asset.unit}!`, 'error');
        playAudioChime('error');
        return;
      }

      const netReceive = grossIDR - fee;
      const costBasis = coinAmount * owned.avgPrice;
      const realizedPnl = Math.round(grossIDR - costBasis - fee);

      appState.cash += netReceive;

      const remainingQty = owned.qty - coinAmount;
      if (remainingQty <= 0.0000001) {
        delete appState.portfolio[symbol];
      } else {
        owned.qty = remainingQty;
        owned.totalInvested = Math.round(remainingQty * owned.avgPrice);
      }

      appState.history.unshift({
        id: 'tx-' + Date.now(),
        timestamp: new Date().toISOString(),
        type: 'SELL',
        symbol: symbol,
        name: asset.name,
        category: 'CRYPTO',
        qtyDisplay: `${coinAmount.toFixed(6)} ${asset.unit}`,
        price: currentPrice,
        fee: fee,
        total: netReceive,
        realizedPnl: realizedPnl
      });

      saveState();
      updateUI();
      playAudioChime('sell');
      showToast(`Sukses Jual ${coinAmount.toFixed(4)} ${asset.unit}! PnL: ${formatIDR(realizedPnl)}`, realizedPnl >= 0 ? 'success' : 'info');
      cryptoInput.value = '';
      calculateOrderEstimates();
    }
  }
}

// Quick Sell from Portfolio row
function quickSellAsset(symbol) {
  selectAsset(symbol);
  setOrderType('SELL');
  const asset = ASSETS_CONFIG[symbol];
  const holding = appState.portfolio[symbol];
  if (!holding) return;

  if (asset.category === 'STOCK') {
    const lotInput = document.getElementById('input-stock-lot');
    if (lotInput) lotInput.value = holding.lots;
  } else {
    appState.cryptoInputMode = 'COIN';
    updateCryptoInputModeUI();
    const cryptoInput = document.getElementById('input-crypto-amount');
    if (cryptoInput) cryptoInput.value = holding.qty.toFixed(6);
  }
  calculateOrderEstimates();
}

// ==========================================
// 7. ORDER CALCULATION ESTIMATES
// ==========================================
function calculateOrderEstimates() {
  const symbol = appState.selectedAsset;
  const asset = ASSETS_CONFIG[symbol];
  const currentPrice = marketData[symbol]?.price || asset?.defaultPrice || 0;
  const isStock = asset.category === 'STOCK';
  const isBuy = appState.orderType === 'BUY';

  // Elements
  const execPriceEl = document.getElementById('order-exec-price');
  const feeLabelEl = document.getElementById('order-fee-label');
  const feeAmountEl = document.getElementById('order-fee-amount');
  const totalLabelEl = document.getElementById('order-total-label');
  const totalAmountEl = document.getElementById('order-total-amount');
  const remainCashEl = document.getElementById('order-remaining-cash');
  const availBalanceEl = document.getElementById('order-available-balance');
  const balanceLabelEl = document.getElementById('order-balance-label');
  const submitBtnText = document.getElementById('btn-submit-text');

  if (execPriceEl) execPriceEl.textContent = formatIDR(currentPrice);

  let gross = 0;
  let fee = 0;
  let netTotal = 0;

  if (isStock) {
    const lotInput = document.getElementById('input-stock-lot');
    const lots = parseInt(lotInput?.value || '0', 10);
    const shares = Math.max(0, lots) * 100;
    
    const sharesEl = document.getElementById('stock-shares-count');
    if (sharesEl) sharesEl.textContent = `${formatNumber(shares)} Lembar`;

    gross = shares * currentPrice;
    const feeRate = isBuy ? FEE_STOCK_BUY : FEE_STOCK_SELL;
    fee = Math.round(gross * feeRate);
    netTotal = isBuy ? (gross + fee) : (gross - fee);

    if (feeLabelEl) feeLabelEl.textContent = `Biaya Sekuritas (${(feeRate * 100).toFixed(2)}%):`;

    if (isBuy) {
      if (balanceLabelEl) balanceLabelEl.textContent = 'Kas Tersedia:';
      if (availBalanceEl) availBalanceEl.textContent = formatIDR(appState.cash);
      if (remainCashEl) remainCashEl.textContent = formatIDR(Math.max(0, appState.cash - netTotal));
    } else {
      const owned = appState.portfolio[symbol]?.lots || 0;
      if (balanceLabelEl) balanceLabelEl.textContent = 'Lot Dimiliki:';
      if (availBalanceEl) availBalanceEl.textContent = `${owned} Lot`;
      if (remainCashEl) remainCashEl.textContent = formatIDR(appState.cash + netTotal);
    }

  } else {
    // Crypto
    const cryptoInput = document.getElementById('input-crypto-amount');
    const inputVal = parseFloat(cryptoInput?.value || '0');
    const estimateEl = document.getElementById('crypto-estimate-text');

    if (appState.cryptoInputMode === 'IDR') {
      const rawVal = isNaN(inputVal) ? 0 : inputVal;
      gross = appState.currency === 'USD' ? (rawVal * (usdIdrRate || 15850)) : rawVal;
      const coin = currentPrice > 0 ? (gross / currentPrice) : 0;
      if (estimateEl) estimateEl.textContent = `${coin.toFixed(6)} ${asset.unit}`;
    } else {
      const coin = isNaN(inputVal) ? 0 : inputVal;
      gross = coin * currentPrice;
      if (estimateEl) estimateEl.textContent = formatCurrency(gross);
    }

    fee = Math.round(gross * FEE_CRYPTO);
    netTotal = isBuy ? (gross + fee) : (gross - fee);

    if (feeLabelEl) feeLabelEl.textContent = `Biaya Exchange (${(FEE_CRYPTO * 100).toFixed(2)}%):`;

    if (isBuy) {
      if (balanceLabelEl) balanceLabelEl.textContent = 'Kas Tersedia:';
      if (availBalanceEl) availBalanceEl.textContent = formatIDR(appState.cash);
      if (remainCashEl) remainCashEl.textContent = formatIDR(Math.max(0, appState.cash - netTotal));
    } else {
      const owned = appState.portfolio[symbol]?.qty || 0;
      if (balanceLabelEl) balanceLabelEl.textContent = 'Koin Dimiliki:';
      if (availBalanceEl) availBalanceEl.textContent = `${owned.toFixed(6)} ${asset.unit}`;
      if (remainCashEl) remainCashEl.textContent = formatIDR(appState.cash + netTotal);
    }
  }

  if (feeAmountEl) feeAmountEl.textContent = formatIDR(fee);
  if (totalLabelEl) totalLabelEl.textContent = isBuy ? 'Total Bayar:' : 'Total Diterima:';
  if (totalAmountEl) {
    totalAmountEl.textContent = formatIDR(netTotal);
    totalAmountEl.className = isBuy ? 'font-mono-numbers text-sm text-emerald-400 font-bold' : 'font-mono-numbers text-sm text-rose-400 font-bold';
  }

  if (submitBtnText) {
    const action = isBuy ? 'BELI' : 'JUAL';
    submitBtnText.textContent = `${action} ${asset.shortSymbol || asset.symbol}`;
  }
}

// Preset Buttons for Lots
function setStockLotPreset(multiplier) {
  const lotInput = document.getElementById('input-stock-lot');
  if (!lotInput) return;

  if (multiplier === 'max') {
    const symbol = appState.selectedAsset;
    const currentPrice = marketData[symbol]?.price || ASSETS_CONFIG[symbol]?.defaultPrice || 1000;
    if (appState.orderType === 'BUY') {
      const oneLotCost = (100 * currentPrice) * (1 + FEE_STOCK_BUY);
      const maxLots = Math.max(1, Math.floor(appState.cash / oneLotCost));
      lotInput.value = maxLots;
    } else {
      const owned = appState.portfolio[symbol]?.lots || 0;
      lotInput.value = Math.max(1, owned);
    }
  } else {
    lotInput.value = multiplier;
  }
  calculateOrderEstimates();
}

// Preset Buttons for Crypto %
function setCryptoPctPreset(pct) {
  const symbol = appState.selectedAsset;
  const asset = ASSETS_CONFIG[symbol];
  const currentPrice = marketData[symbol]?.price || asset?.defaultPrice || 1;
  const cryptoInput = document.getElementById('input-crypto-amount');
  if (!cryptoInput) return;

  if (appState.orderType === 'BUY') {
    const spendable = (appState.cash * (pct / 100)) / (1 + FEE_CRYPTO);
    if (appState.cryptoInputMode === 'IDR') {
      if (appState.currency === 'USD') {
        cryptoInput.value = (spendable / (usdIdrRate || 15850)).toFixed(2);
      } else {
        cryptoInput.value = Math.floor(spendable);
      }
    } else {
      cryptoInput.value = (spendable / currentPrice).toFixed(6);
    }
  } else {
    const owned = appState.portfolio[symbol]?.qty || 0;
    const targetCoin = owned * (pct / 100);
    if (appState.cryptoInputMode === 'IDR') {
      const grossIDR = targetCoin * currentPrice;
      if (appState.currency === 'USD') {
        cryptoInput.value = (grossIDR / (usdIdrRate || 15850)).toFixed(2);
      } else {
        cryptoInput.value = Math.floor(grossIDR);
      }
    } else {
      cryptoInput.value = targetCoin.toFixed(6);
    }
  }
  calculateOrderEstimates();
}

// ==========================================
// 8. UI UPDATE & RENDERING ENGINE
// ==========================================
function updateUI() {
  updateHeaderStats();
  renderWatchlist();
  renderActiveAssetHeader();
  renderActiveHoldingInfo();
  renderPortfolioTable();
  renderHistoryTable();
  calculateOrderEstimates();

  // Re-run Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function updateHeaderStats() {
  // Calculate total portfolio market value & floating PnL
  let totalPortfolioValue = 0;
  let totalCostBasis = 0;

  for (const [sym, holding] of Object.entries(appState.portfolio)) {
    const currentPrice = marketData[sym]?.price || ASSETS_CONFIG[sym]?.defaultPrice || holding.avgPrice;
    let curVal = 0;
    if (holding.category === 'STOCK') {
      curVal = holding.shares * currentPrice;
    } else {
      curVal = holding.qty * currentPrice;
    }
    totalPortfolioValue += curVal;
    totalCostBasis += holding.totalInvested;
  }

  const netWorth = appState.cash + totalPortfolioValue;
  const floatingPnl = totalPortfolioValue - totalCostBasis;
  const floatingPnlPct = totalCostBasis > 0 ? (floatingPnl / totalCostBasis) * 100 : 0;

  // Header Elements
  const netWorthEl = document.getElementById('header-networth');
  const cashEl = document.getElementById('header-cash');
  const pnlEl = document.getElementById('header-pnl');

  if (netWorthEl) netWorthEl.textContent = formatIDR(netWorth);
  if (cashEl) cashEl.textContent = formatIDR(appState.cash);
  
  if (pnlEl) {
    const sign = floatingPnl >= 0 ? '+' : '';
    const colorClass = floatingPnl > 0 ? 'text-emerald-400' : floatingPnl < 0 ? 'text-rose-400' : 'text-slate-300';
    pnlEl.textContent = `${sign}${formatIDR(floatingPnl)} (${sign}${floatingPnlPct.toFixed(2)}%)`;
    pnlEl.className = `font-mono-numbers font-bold text-xs lg:text-sm ${colorClass}`;
  }

  // Header IHSG Stat
  const ihsgData = marketData[IHSG_SYMBOL];
  const ihsgPriceEl = document.getElementById('header-ihsg-price');
  const ihsgChangeEl = document.getElementById('header-ihsg-change');
  if (ihsgData && ihsgPriceEl && ihsgChangeEl) {
    ihsgPriceEl.textContent = formatNumber(ihsgData.price, 2);
    const isUp = ihsgData.change24hPct >= 0;
    const sign = isUp ? '+' : '';
    ihsgChangeEl.textContent = `${sign}${ihsgData.change24hPct.toFixed(2)}%`;
    ihsgChangeEl.className = `font-mono-numbers text-[11px] font-semibold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`;
  }
}

function renderWatchlist() {
  const container = document.getElementById('watchlist-container');
  if (!container) return;

  const filter = appState.currentFilter;
  let html = '';

  for (const [sym, config] of Object.entries(ASSETS_CONFIG)) {
    if (filter === 'crypto' && config.category !== 'CRYPTO') continue;
    if (filter === 'stock' && config.category !== 'STOCK') continue;

    const data = marketData[sym] || {};
    const price = data.price || config.defaultPrice;
    const changePct = data.change24hPct || 0;
    const isUp = changePct >= 0;
    const isSelected = appState.selectedAsset === sym;

    html += `
      <div class="watchlist-item p-3 cursor-pointer transition flex items-center justify-between ${isSelected ? 'bg-brand-hover border-l-4 border-emerald-400' : 'hover:bg-brand-hover/60'}" 
           data-symbol="${sym}" data-symbol-row="${sym}" onclick="selectAsset('${sym}')">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white" style="background-color: ${config.iconColor}22; border: 1px solid ${config.iconColor}55; color: ${config.iconColor}">
            ${config.shortSymbol || config.symbol.slice(0, 3)}
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-xs text-white">${config.shortSymbol || config.symbol}</span>
              <span class="text-[9px] font-semibold px-1 rounded bg-brand-dark border border-brand-border text-slate-400">${config.category === 'STOCK' ? 'IDX' : 'COIN'}</span>
            </div>
            <span class="text-[10px] text-slate-400 truncate max-w-[110px] block">${config.name}</span>
          </div>
        </div>

        <div class="text-right">
          <span class="font-mono-numbers text-xs font-bold text-white block">${formatIDR(price)}</span>
          <span class="font-mono-numbers text-[10px] font-semibold ${isUp ? 'text-emerald-400' : 'text-rose-400'}">
            ${isUp ? '+' : ''}${changePct.toFixed(2)}%
          </span>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

function renderActiveAssetHeader() {
  const sym = appState.selectedAsset;
  const config = ASSETS_CONFIG[sym];
  const data = marketData[sym] || {};
  const price = data.price || config.defaultPrice;
  const change = data.change24h || 0;
  const changePct = data.change24hPct || 0;
  const isUp = changePct >= 0;

  // Header Elements
  const iconEl = document.getElementById('active-asset-icon');
  const nameEl = document.getElementById('active-asset-name');
  const symbolEl = document.getElementById('active-asset-symbol');
  const badgeEl = document.getElementById('active-asset-badge');
  const descEl = document.getElementById('active-asset-desc');
  const priceEl = document.getElementById('active-asset-price');
  const changeEl = document.getElementById('active-asset-change');
  const highEl = document.getElementById('active-stat-high');
  const lowEl = document.getElementById('active-stat-low');
  const prevEl = document.getElementById('active-stat-prev');

  if (iconEl) {
    iconEl.textContent = config.shortSymbol || config.symbol.slice(0, 4);
    iconEl.style.backgroundColor = `${config.iconColor}22`;
    iconEl.style.borderColor = `${config.iconColor}66`;
    iconEl.style.color = config.iconColor;
  }

  if (nameEl) nameEl.textContent = config.name;
  if (symbolEl) symbolEl.textContent = config.shortSymbol || config.symbol;
  if (descEl) descEl.textContent = config.desc;

  if (badgeEl) {
    badgeEl.textContent = config.category === 'STOCK' ? 'SAHAM IDX (1 LOT = 100 LBR)' : 'KRIPTO GLOBAL (24/7)';
    badgeEl.className = config.category === 'STOCK'
      ? 'text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      : 'text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20';
  }

  if (priceEl) priceEl.textContent = formatIDR(price);
  if (changeEl) {
    const sign = isUp ? '+' : '';
    changeEl.innerHTML = `
      <span class="${isUp ? 'text-emerald-400' : 'text-rose-400'}">${sign}${formatIDR(change)} (${sign}${changePct.toFixed(2)}%)</span>
    `;
  }

  if (highEl) highEl.textContent = formatIDR(data.high || price * 1.015);
  if (lowEl) lowEl.textContent = formatIDR(data.low || price * 0.985);
  if (prevEl) prevEl.textContent = formatIDR(data.prevClose || price);

  // Switch Order Form inputs based on asset category
  const isStock = config.category === 'STOCK';
  const stockContainer = document.getElementById('input-container-stock');
  const cryptoContainer = document.getElementById('input-container-crypto');

  if (stockContainer && cryptoContainer) {
    if (isStock) {
      stockContainer.classList.remove('hidden');
      cryptoContainer.classList.add('hidden');
    } else {
      stockContainer.classList.add('hidden');
      cryptoContainer.classList.remove('hidden');
    }
  }
}

function renderActiveHoldingInfo() {
  const sym = appState.selectedAsset;
  const config = ASSETS_CONFIG[sym];
  const holding = appState.portfolio[sym];
  const qtyEl = document.getElementById('holding-qty-text');
  const pnlEl = document.getElementById('holding-pnl-text');

  if (!holding) {
    if (qtyEl) qtyEl.textContent = '0 (Belum punya)';
    if (pnlEl) {
      pnlEl.textContent = 'Rp 0 (0.00%)';
      pnlEl.className = 'font-mono-numbers font-bold text-slate-400';
    }
    return;
  }

  const currentPrice = marketData[sym]?.price || config.defaultPrice;
  let curVal = 0;
  let displayQty = '';

  if (config.category === 'STOCK') {
    curVal = holding.shares * currentPrice;
    displayQty = `${holding.lots} Lot (${formatNumber(holding.shares)} lbr)`;
  } else {
    curVal = holding.qty * currentPrice;
    displayQty = `${holding.qty.toFixed(6)} ${config.unit}`;
  }

  const pnl = curVal - holding.totalInvested;
  const pnlPct = holding.totalInvested > 0 ? (pnl / holding.totalInvested) * 100 : 0;
  const isProfit = pnl >= 0;
  const sign = isProfit ? '+' : '';

  if (qtyEl) qtyEl.textContent = `${displayQty} ≈ ${formatIDR(curVal)}`;
  if (pnlEl) {
    pnlEl.textContent = `${sign}${formatIDR(pnl)} (${sign}${pnlPct.toFixed(2)}%)`;
    pnlEl.className = `font-mono-numbers font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`;
  }
}

function renderPortfolioTable() {
  const tbody = document.getElementById('portfolio-table-body');
  const emptyState = document.getElementById('portfolio-empty-state');
  const badgeCount = document.getElementById('portfolio-badge-count');
  if (!tbody) return;

  const keys = Object.keys(appState.portfolio);
  if (badgeCount) badgeCount.textContent = keys.length;

  if (keys.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  let html = '';
  for (const sym of keys) {
    const holding = appState.portfolio[sym];
    const config = ASSETS_CONFIG[sym] || {};
    const currentPrice = marketData[sym]?.price || config.defaultPrice || holding.avgPrice;

    let totalVal = 0;
    let qtyDisplay = '';

    if (holding.category === 'STOCK') {
      totalVal = holding.shares * currentPrice;
      qtyDisplay = `${holding.lots} Lot <span class="text-slate-400 text-[10px]">(${formatNumber(holding.shares)} lbr)</span>`;
    } else {
      totalVal = holding.qty * currentPrice;
      qtyDisplay = `${holding.qty.toFixed(6)} ${config.unit || ''}`;
    }

    const pnl = totalVal - holding.totalInvested;
    const pnlPct = holding.totalInvested > 0 ? (pnl / holding.totalInvested) * 100 : 0;
    const isProfit = pnl >= 0;
    const sign = isProfit ? '+' : '';

    html += `
      <tr class="hover:bg-brand-hover/40 transition">
        <td class="py-3 font-bold text-white flex items-center gap-2">
          <span class="w-6 h-6 rounded-lg flex items-center justify-center text-[10px]" style="background-color: ${config.iconColor || '#fff'}22; color: ${config.iconColor || '#fff'}">
            ${config.shortSymbol || sym.slice(0, 3)}
          </span>
          <span>${config.shortSymbol || sym}</span>
        </td>
        <td class="py-3 text-slate-400">
          <span class="text-[10px] px-2 py-0.5 rounded bg-brand-dark border border-brand-border">${holding.category}</span>
        </td>
        <td class="py-3 text-right text-white">${qtyDisplay}</td>
        <td class="py-3 text-right text-slate-300">${formatIDR(holding.avgPrice)}</td>
        <td class="py-3 text-right font-bold text-white">${formatIDR(currentPrice)}</td>
        <td class="py-3 text-right font-bold text-white">${formatIDR(totalVal)}</td>
        <td class="py-3 text-right font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}">
          ${sign}${formatIDR(pnl)} <span class="text-[10px] font-normal">(${sign}${pnlPct.toFixed(2)}%)</span>
        </td>
        <td class="py-3 text-center">
          <button onclick="quickSellAsset('${sym}')" class="px-2.5 py-1 rounded-lg text-[10px] font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition">
            Jual
          </button>
        </td>
      </tr>
    `;
  }

  tbody.innerHTML = html;
}

function renderHistoryTable() {
  const tbody = document.getElementById('history-table-body');
  const emptyState = document.getElementById('history-empty-state');
  const badgeCount = document.getElementById('history-badge-count');
  if (!tbody) return;

  const history = appState.history;
  if (badgeCount) badgeCount.textContent = history.length;

  if (history.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  let html = '';
  // Show last 25 transactions
  for (const item of history.slice(0, 25)) {
    const isBuy = item.type === 'BUY';
    const date = new Date(item.timestamp);
    const dateStr = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    html += `
      <tr class="hover:bg-brand-hover/40 transition">
        <td class="py-2.5 text-slate-400 text-[11px]">${dateStr} ${timeStr}</td>
        <td class="py-2.5">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isBuy ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
            ${isBuy ? 'BELI' : 'JUAL'}
          </span>
        </td>
        <td class="py-2.5 font-bold text-white">${item.symbol}</td>
        <td class="py-2.5 text-right text-slate-200">${item.qtyDisplay}</td>
        <td class="py-2.5 text-right text-slate-300">${formatIDR(item.price)}</td>
        <td class="py-2.5 text-right text-slate-400">${formatIDR(item.fee)}</td>
        <td class="py-2.5 text-right font-bold text-white">${formatIDR(item.total)}</td>
        <td class="py-2.5 text-right font-bold ${item.realizedPnl > 0 ? 'text-emerald-400' : item.realizedPnl < 0 ? 'text-rose-400' : 'text-slate-400'}">
          ${item.type === 'SELL' ? (item.realizedPnl >= 0 ? '+' : '') + formatIDR(item.realizedPnl) : '-'}
        </td>
      </tr>
    `;
  }

  tbody.innerHTML = html;
}

// ==========================================
// 9. EVENT LISTENERS & USER INTERACTION
// ==========================================
function selectAsset(symbol) {
  if (!ASSETS_CONFIG[symbol]) return;
  appState.selectedAsset = symbol;
  updateUI();
  renderChartData(symbol);
}

function setOrderType(type) {
  appState.orderType = type;
  const buyTab = document.getElementById('tab-order-buy');
  const sellTab = document.getElementById('tab-order-sell');
  const submitBtn = document.getElementById('btn-submit-order');

  if (type === 'BUY') {
    buyTab.className = 'py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-emerald-500 shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-1.5';
    sellTab.className = 'py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-400 bg-brand-dark hover:text-white transition flex items-center justify-center gap-1.5';
    submitBtn.className = 'w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider text-white bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2';
  } else {
    sellTab.className = 'py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-rose-500 shadow-lg shadow-rose-500/25 transition flex items-center justify-center gap-1.5';
    buyTab.className = 'py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-400 bg-brand-dark hover:text-white transition flex items-center justify-center gap-1.5';
    submitBtn.className = 'w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider text-white bg-rose-500 hover:bg-rose-400 active:scale-[0.99] shadow-lg shadow-rose-500/25 transition flex items-center justify-center gap-2';
  }

  calculateOrderEstimates();
}

function updateCryptoInputModeUI() {
  const modeIdrBtn = document.getElementById('crypto-mode-idr');
  const modeCoinBtn = document.getElementById('crypto-mode-coin');
  const prefix = document.getElementById('crypto-input-prefix');
  const input = document.getElementById('input-crypto-amount');
  const asset = ASSETS_CONFIG[appState.selectedAsset];
  const isUSD = appState.currency === 'USD';

  if (modeIdrBtn) {
    modeIdrBtn.textContent = isUSD ? 'USD ($)' : 'IDR (Rp)';
  }

  if (appState.cryptoInputMode === 'IDR') {
    if (modeIdrBtn) modeIdrBtn.className = 'px-2 py-0.5 rounded bg-brand-card font-medium text-white transition';
    if (modeCoinBtn) modeCoinBtn.className = 'px-2 py-0.5 rounded text-slate-400 hover:text-white transition';
    if (prefix) prefix.textContent = isUSD ? '$' : 'Rp';
    if (input) input.placeholder = isUSD ? '100' : '1.000.000';
  } else {
    if (modeCoinBtn) modeCoinBtn.className = 'px-2 py-0.5 rounded bg-brand-card font-medium text-white transition';
    if (modeIdrBtn) modeIdrBtn.className = 'px-2 py-0.5 rounded text-slate-400 hover:text-white transition';
    if (prefix) prefix.textContent = asset ? asset.unit : 'COIN';
    if (input) input.placeholder = '0.05';
  }
}

function setupEventListeners() {
  // Currency Switcher (IDR vs USD)
  document.getElementById('curr-btn-idr')?.addEventListener('click', () => setCurrency('IDR'));
  document.getElementById('curr-btn-usd')?.addEventListener('click', () => setCurrency('USD'));

  // Buy / Sell Tabs
  document.getElementById('tab-order-buy')?.addEventListener('click', () => setOrderType('BUY'));
  document.getElementById('tab-order-sell')?.addEventListener('click', () => setOrderType('SELL'));

  // Submit Order
  document.getElementById('btn-submit-order')?.addEventListener('click', executeTrade);

  // Stock Lot Stepper Buttons
  const lotInput = document.getElementById('input-stock-lot');
  document.getElementById('btn-lot-minus')?.addEventListener('click', () => {
    if (lotInput) {
      const val = parseInt(lotInput.value || '1', 10);
      lotInput.value = Math.max(1, val - 1);
      calculateOrderEstimates();
    }
  });

  document.getElementById('btn-lot-plus')?.addEventListener('click', () => {
    if (lotInput) {
      const val = parseInt(lotInput.value || '1', 10);
      lotInput.value = val + 1;
      calculateOrderEstimates();
    }
  });

  lotInput?.addEventListener('input', calculateOrderEstimates);

  // Lot Preset Buttons
  document.querySelectorAll('.btn-lot-preset').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const lots = e.target.dataset.lots;
      setStockLotPreset(parseInt(lots, 10));
    });
  });

  document.getElementById('btn-lot-max')?.addEventListener('click', () => setStockLotPreset('max'));

  // Crypto Mode Switcher (IDR vs COIN)
  document.getElementById('crypto-mode-idr')?.addEventListener('click', () => {
    appState.cryptoInputMode = 'IDR';
    updateCryptoInputModeUI();
    calculateOrderEstimates();
  });

  document.getElementById('crypto-mode-coin')?.addEventListener('click', () => {
    appState.cryptoInputMode = 'COIN';
    updateCryptoInputModeUI();
    calculateOrderEstimates();
  });

  document.getElementById('input-crypto-amount')?.addEventListener('input', calculateOrderEstimates);

  // Crypto % Buttons
  document.querySelectorAll('.btn-pct-preset').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const pct = parseFloat(e.target.dataset.pct);
      setCryptoPctPreset(pct);
    });
  });

  // Watchlist Filter Tabs
  document.querySelectorAll('.watchlist-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.watchlist-tab').forEach(b => {
        b.className = 'watchlist-tab flex-1 py-1.5 rounded-lg font-medium text-slate-400 hover:text-white text-center transition';
      });
      e.target.className = 'watchlist-tab flex-1 py-1.5 rounded-lg font-medium text-white bg-brand-card text-center transition';
      appState.currentFilter = e.target.dataset.filter;
      renderWatchlist();
    });
  });

  // Bottom Tabs (Portfolio vs History)
  const tabPortfolio = document.getElementById('tab-btn-portfolio');
  const tabHistory = document.getElementById('tab-btn-history');
  const contentPortfolio = document.getElementById('tab-content-portfolio');
  const contentHistory = document.getElementById('tab-content-history');

  tabPortfolio?.addEventListener('click', () => {
    tabPortfolio.className = 'bottom-tab py-3 px-3 text-xs font-bold text-white border-b-2 border-emerald-500 flex items-center gap-2 transition';
    tabHistory.className = 'bottom-tab py-3 px-3 text-xs font-semibold text-slate-400 hover:text-white border-b-2 border-transparent flex items-center gap-2 transition';
    contentPortfolio?.classList.remove('hidden');
    contentHistory?.classList.add('hidden');
  });

  tabHistory?.addEventListener('click', () => {
    tabHistory.className = 'bottom-tab py-3 px-3 text-xs font-bold text-white border-b-2 border-emerald-500 flex items-center gap-2 transition';
    tabPortfolio.className = 'bottom-tab py-3 px-3 text-xs font-semibold text-slate-400 hover:text-white border-b-2 border-transparent flex items-center gap-2 transition';
    contentHistory?.classList.remove('hidden');
    contentPortfolio?.classList.add('hidden');
  });

  // Chart Type Switcher (Candlestick vs Line)
  document.getElementById('chart-type-candle')?.addEventListener('click', () => setChartType('candlestick'));
  document.getElementById('chart-type-line')?.addEventListener('click', () => setChartType('line'));

  // Chart Timeframe Buttons (Quick pills & Dropdown items)
  document.querySelectorAll('.chart-tf-btn, .chart-tf-dropdown-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tf = e.currentTarget.dataset.tf;
      if (tf) {
        setTimeframe(tf);
        const menu = document.getElementById('interval-dropdown-menu');
        const chevron = document.getElementById('interval-dropdown-chevron');
        if (menu) menu.classList.add('hidden');
        if (chevron) chevron.classList.remove('rotate-180');
      }
    });
  });

  // Interval Dropdown Menu Toggle
  const intervalBtn = document.getElementById('btn-interval-dropdown');
  const intervalMenu = document.getElementById('interval-dropdown-menu');
  const intervalChevron = document.getElementById('interval-dropdown-chevron');

  intervalBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = intervalMenu?.classList.toggle('hidden');
    if (intervalChevron) {
      if (isHidden) {
        intervalChevron.classList.remove('rotate-180');
      } else {
        intervalChevron.classList.add('rotate-180');
      }
    }
  });

  // Close interval dropdown when clicking anywhere outside
  document.addEventListener('click', (e) => {
    if (intervalMenu && !intervalMenu.contains(e.target) && !intervalBtn?.contains(e.target)) {
      intervalMenu.classList.add('hidden');
      intervalChevron?.classList.remove('rotate-180');
    }
  });

  // MACD Indicator Toggle Buttons
  document.getElementById('btn-toggle-macd')?.addEventListener('click', () => toggleMacd());
  document.getElementById('btn-close-macd')?.addEventListener('click', () => toggleMacd(false));
}

// ==========================================
// 10. HELPER FUNCTIONS
// ==========================================
function formatCurrency(amountInIDR, decimals = null) {
  if (typeof amountInIDR !== 'number' || isNaN(amountInIDR)) {
    return appState.currency === 'USD' ? '$0.00' : 'Rp 0';
  }

  if (appState.currency === 'USD') {
    const rate = (usdIdrRate && usdIdrRate > 0) ? usdIdrRate : 15850;
    const amountUSD = amountInIDR / rate;
    const abs = Math.abs(amountUSD);
    let dec = decimals !== null ? decimals : (abs >= 100 ? 2 : abs >= 1 ? 2 : 4);
    return '$' + amountUSD.toLocaleString('en-US', {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec
    });
  }

  return 'Rp ' + Math.round(amountInIDR).toLocaleString('id-ID');
}

function formatIDR(amount, decimals = null) {
  return formatCurrency(amount, decimals);
}

function formatNumber(num, decimals = 0) {
  if (typeof num !== 'number' || isNaN(num)) return '0';
  return num.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const isSuccess = type === 'success';
  const isError = type === 'error';

  toast.className = `p-3.5 rounded-xl border shadow-xl flex items-center gap-3 text-xs font-semibold text-white pointer-events-auto toast-enter ${
    isSuccess
      ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-emerald-950/50'
      : isError
      ? 'bg-rose-950/90 border-rose-500/40 text-rose-200 shadow-rose-950/50'
      : 'bg-slate-900/90 border-slate-700 text-slate-200'
  }`;

  const iconName = isSuccess ? 'check-circle-2' : isError ? 'alert-circle' : 'info';
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-4 h-4 flex-shrink-0"></i>
    <span class="flex-1">${message}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  requestAnimationFrame(() => {
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-show');
  });

  setTimeout(() => {
    toast.classList.remove('toast-show');
    toast.classList.add('toast-leave');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================
// 11. APPLICATION INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initChart();
  setupEventListeners();
  updateTimeframeUI();
  updateCurrencySelectorUI();
  updateCryptoInputModeUI();
  updateUI();
  if (appState.showMacd) {
    toggleMacd(true);
  }
  if (window.lucide) {
    lucide.createIcons();
  }
  startDataLoop();
});

