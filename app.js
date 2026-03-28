/**
 * =========================================
 * TPEXplore Application Logic (FinMind API Edition)
 * =========================================
 */

// --- Global Chart.js configuration ---
Chart.defaults.color = 'hsl(0, 0%, 63.9%)'; 
Chart.defaults.font.family = "'Inter', 'Noto Sans TC', sans-serif";
Chart.defaults.plugins.tooltip.backgroundColor = 'hsl(0, 0%, 14.9%)';
Chart.defaults.plugins.tooltip.titleColor = 'hsl(0, 0%, 98%)';
Chart.defaults.plugins.tooltip.bodyColor = 'hsl(0, 0%, 98%)';
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.cornerRadius = 6;
Chart.defaults.plugins.tooltip.borderColor = 'hsl(0, 0%, 20%)';
Chart.defaults.plugins.tooltip.borderWidth = 1;

const colors = {
  up: 'hsl(0, 84%, 60%)',
  down: 'hsl(142, 71%, 45%)',
  grid: 'hsla(0, 0%, 15%, 0.5)',
  lineFill: 'hsla(0, 0%, 98%, 0.03)',
  lineBorder: 'hsl(0, 0%, 80%)',
};

// --- Chart Instances & State ---
let taiexChartInstance = null;
let foreignChartInstance = null;
let taiexRawData = []; 

// Calculate start date (going back 21 days ensures we get at least 10 trading days even with weekends/holidays)
const d = new Date();
d.setDate(d.getDate() - 21);
const fallbackStartDate = d.toISOString().split('T')[0];

function updateLastUpdatedTime() {
  const timeEl = document.querySelector('.last-updated');
  if (timeEl) {
    const now = new Date();
    timeEl.innerText = `資料最後同步時間：${now.toLocaleString()}`;
  }
}

// --- API Fetchers (FinMind API - CORS Friendly open data) ---

async function fetchData() {
  const taiexLoading = document.getElementById('taiexLoading');
  const foreignLoading = document.getElementById('foreignLoading');
  if (taiexLoading) taiexLoading.classList.add('active');
  if (foreignLoading) foreignLoading.classList.add('active');
  
  try {
    // Parallel Fetching for Market Data & Foreign Investor Data
    const [taiexRes, foreignRes] = await Promise.all([
      fetch(`https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=TAIEX&start_date=${fallbackStartDate}`),
      fetch(`https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockTotalInstitutionalInvestors&start_date=${fallbackStartDate}`)
    ]);

    const taiexJson = await taiexRes.json();
    const foreignJson = await foreignRes.json();

    // -- 1. Process TAIEX Data --
    if (taiexJson.data && taiexJson.data.length > 0) {
      taiexRawData = taiexJson.data;
      const latest = taiexRawData[taiexRawData.length - 1];
      const prev = taiexRawData[taiexRawData.length - 2];

      // Update TAIEX KPI
      const taiexEl = document.getElementById('taiexCurrentValue');
      if (taiexEl) taiexEl.innerText = latest.close.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});

      const taiexCard = document.getElementById('taiexCard');
      if (taiexCard) {
        taiexCard.classList.remove('is-up', 'is-down');
        if (latest.spread > 0) taiexCard.classList.add('is-up');
        else if (latest.spread < 0) taiexCard.classList.add('is-down');
      }

      // Update Volume KPI (Trading_money is total Value in NTD. Convert to 億)
      const volumeEl = document.getElementById('volumeCurrentValue');
      const volInHundredMillion = latest.Trading_money / 100000000;
      const prevVolInHundredMillion = prev ? prev.Trading_money / 100000000 : volInHundredMillion;
      if (volumeEl) volumeEl.innerText = volInHundredMillion.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});

      const volumeCard = document.getElementById('volumeCard');
      if (volumeCard) {
        volumeCard.classList.remove('is-up', 'is-down');
        if (volInHundredMillion > prevVolInHundredMillion) volumeCard.classList.add('is-up');
        else if (volInHundredMillion < prevVolInHundredMillion) volumeCard.classList.add('is-down');
      }

      renderTaiexChart();
    }

    // -- 2. Process Foreign Data --
    if (foreignJson.data && foreignJson.data.length > 0) {
      // Filter out only Global Foreign Investors
      const foreignData = foreignJson.data.filter(item => item.name === 'Foreign_Investor');
      
      if (foreignData.length > 0) {
        const history = foreignData.slice(-10); // Strictly the last 10 days
        
        const latest = history[history.length - 1];
        const latestSpreadInHundredMillion = (latest.buy - latest.sell) / 100000000;
        
        // Update Foreign KPI
        const foreignEl = document.getElementById('foreignCurrentValue');
        if (foreignEl) {
          foreignEl.innerText = `${latestSpreadInHundredMillion >= 0 ? '+' : ''}${latestSpreadInHundredMillion.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}`;
          foreignEl.className = `metric-value ${latestSpreadInHundredMillion >= 0 ? 'text-red' : 'text-green'}`;
        }
        
        const foreignCard = document.getElementById('foreignCard');
        if (foreignCard) {
          foreignCard.classList.remove('is-up', 'is-down');
          if (latestSpreadInHundredMillion > 0) foreignCard.classList.add('is-up');
          else if (latestSpreadInHundredMillion < 0) foreignCard.classList.add('is-down');
        }

        // Draw Foreign Chart
        const labels = history.map(item => item.date.slice(5).replace('-', '/'));
        const spreadData = history.map(item => (item.buy - item.sell) / 100000000);
        
        drawForeignChart(labels, spreadData);
      }
    }

    // Explicitly update time only when logic completes without throwing
    updateLastUpdatedTime();

  } catch (e) {
    console.warn("Real Data API Failed:", e);
    
    // In the rare edge case where FinMind fails, we gracefully render "--" instead of faking data
    const elementsToClear = ['taiexCurrentValue', 'volumeCurrentValue', 'foreignCurrentValue'];
    elementsToClear.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerText = "連線失敗";
    });
  } finally {
    if (taiexLoading) taiexLoading.classList.remove('active');
    if (foreignLoading) foreignLoading.classList.remove('active');
  }
}

// --- Dynamic Range Rendering for TAIEX ---

function renderTaiexChart() {
  if (!taiexRawData || taiexRawData.length === 0) return;
  
  // Directly extract exactly past 10 days
  const sliced = taiexRawData.slice(-10);
  const labels = sliced.map(item => item.date.slice(5).replace('-', '/'));
  const data = sliced.map(item => item.close);
  
  drawTaiexChart(labels, data);
}

// --- Chart Draw Implementations ---

function drawTaiexChart(labels, data) {
  const ctx = document.getElementById('taiexChart').getContext('2d');
  if(taiexChartInstance) taiexChartInstance.destroy();

  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, colors.lineFill);
  gradient.addColorStop(1, 'transparent');

  taiexChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'TAIEX',
        data: data,
        borderColor: colors.lineBorder,
        backgroundColor: gradient,
        borderWidth: 2,
        tension: 0.1, 
        fill: true,
        pointBackgroundColor: colors.lineBorder,
        pointBorderColor: 'hsl(0, 0%, 3.9%)',
        pointBorderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false, drawBorder: false }, ticks: { maxTicksLimit: 10 } },
        y: {
          grid: { color: colors.grid, drawBorder: false },
          border: { dash: [4, 4] },
          min: Math.min(...data) * 0.985 
        }
      },
      interaction: { mode: 'index', intersect: false },
    }
  });
}

function drawForeignChart(labels, data) {
  const ctx = document.getElementById('foreignChart').getContext('2d');
  if(foreignChartInstance) foreignChartInstance.destroy();

  foreignChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: '淨買賣超 (億)',
        data: data,
        backgroundColor: data.map(val => val >= 0 ? colors.up : colors.down),
        borderRadius: 0,
        barPercentage: 0.6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false, drawBorder: false } },
        y: {
          grid: { color: colors.grid, drawBorder: false },
          border: { dash: [4, 4] }
        }
      }
    }
  });
}

// --- DOM Ready ---
document.addEventListener('DOMContentLoaded', () => {
  fetchData();
});
