/**
 * =========================================
 * TPEXplore Application Logic (shadcn/ui style + TWSE OpenAPI)
 * =========================================
 */

// --- Global Chart.js configuration (shadcn/ui Dark Match) ---
Chart.defaults.color = 'hsl(0, 0%, 63.9%)'; // muted-foreground
Chart.defaults.font.family = "'Inter', 'Noto Sans TC', -apple-system, sans-serif";
Chart.defaults.plugins.tooltip.backgroundColor = 'hsl(0, 0%, 14.9%)'; // secondary
Chart.defaults.plugins.tooltip.titleColor = 'hsl(0, 0%, 98%)'; // foreground
Chart.defaults.plugins.tooltip.bodyColor = 'hsl(0, 0%, 98%)';
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.cornerRadius = 6; // radius - 2
Chart.defaults.plugins.tooltip.borderColor = 'hsl(0, 0%, 20%)';
Chart.defaults.plugins.tooltip.borderWidth = 1;

// Colors matching CSS variables (Red = Up/Buy, Green = Down/Sell)
const colors = {
  up: 'hsl(0, 84%, 60%)',
  down: 'hsl(142, 71%, 45%)',
  grid: 'hsl(0, 0%, 14.9%)', // border
  lineFill: 'hsla(0, 0%, 98%, 0.03)',
  lineBorder: 'hsl(0, 0%, 80%)',
};

// --- Chart Instances ---
let taiexChartInstance = null;
let foreignChartInstance = null;

// --- API Fetchers (TWSE OpenAPI) ---

async function fetchTWSETaiex() {
  const loading = document.getElementById('taiexLoading');
  if (loading) loading.classList.add('active');
  
  try {
    // GET from openapi.twse.com.tw (FMTQIK contains trading volume and index)
    const res = await fetch('https://openapi.twse.com.tw/v1/exchangeReport/FMTQIK');
    if (!res.ok) throw new Error('TWSE API response not ok');
    
    const rawData = await res.json();
    
    if (Array.isArray(rawData) && rawData.length > 0) {
      // Slice last 30 trading days
      const last30 = rawData.slice(-30);
      
      // Parse Labels ("1130325" -> "03/25") and Data
      const labels = last30.map(item => item.Date.slice(-4, -2) + '/' + item.Date.slice(-2));
      const data = last30.map(item => parseFloat(item.TAIEX.replace(/,/g, '')));
      
      // Update Top KPIs
      const latest = last30[last30.length - 1];
      const prev = last30[last30.length - 2] || latest;
      
      const currentValEl = document.getElementById('taiexCurrentValue');
      if(currentValEl) currentValEl.innerText = latest.TAIEX;
      
      const changeVal = parseFloat(latest.Change.replace(/,/g, ''));
      const isUp = changeVal >= 0;
      const prevVal = parseFloat(prev.TAIEX.replace(/,/g, ''));
      const changePercent = prevVal ? ((Math.abs(changeVal) / prevVal) * 100).toFixed(2) : '0.00';
      
      const taiexBadge = document.getElementById('taiexChangeBadge');
      if (taiexBadge) {
        taiexBadge.className = `badge ${isUp ? 'red' : 'green'}`;
        taiexBadge.innerHTML = `<i data-lucide="${isUp ? 'arrow-up-right' : 'arrow-down-right'}"></i> ${Math.abs(changeVal)} (${changePercent}%)`;
      }
      
      // Update Volume KPI (convert to 100 million "億" for UI)
      const volTradeValue = parseFloat(latest.TradeValue.replace(/,/g, ''));
      const volEl = document.getElementById('volumeCurrentValue');
      if(volEl) volEl.innerText = (volTradeValue / 100000000).toLocaleString(undefined, {maximumFractionDigits: 0});
      
      lucide.createIcons();
      drawTaiexChart(labels, data);
    }
  } catch(e) {
    console.warn("API Fetch failed, using fallback data for TAIEX", e);
    // Graceful Degradation: Fallback mock if blocked
    const fallback = generateMockData(33000, 30, 200);
    drawTaiexChart(fallback.labels, fallback.data);
  } finally {
    if (loading) loading.classList.remove('active');
  }
}

async function fetchTWSEForeign() {
  const loading = document.getElementById('foreignLoading');
  if (loading) loading.classList.add('active');
  
  try {
    // GET BFI82U (三大法人買賣金額統計表)
    const res = await fetch('https://openapi.twse.com.tw/v1/fund/BFI82U');
    if (!res.ok) throw new Error('TWSE API response not ok');
    
    const rawData = await res.json();
    
    if (Array.isArray(rawData) && rawData.length > 0) {
      // Filter for foreign investors
      const foreignData = rawData.filter(item => item.Name && item.Name.includes("外資及陸資"));
      
      // TWSE OpenAPI BFI82U usually returns only recent data/today.
      if(foreignData.length > 0) {
        // If API only returned today, we pad it with mock historical data for visualization
        let history = foreignData;
        if(history.length < 10) {
           const padCount = 14 - history.length;
           history = [...generateForeignMockHistory(padCount), ...foreignData];
        } else {
           history = history.slice(-14);
        }

        const labels = history.map((item, idx) => {
          if(!item.Day_Date) return `D-${14-idx}`;
          return item.Day_Date.slice(-4, -2) + '/' + item.Day_Date.slice(-2);
        });
        
        // Convert string to millions (百萬)
        const data = history.map(item => {
           if(typeof item.Buy_Sell_Spread === 'number') return item.Buy_Sell_Spread;
           return parseFloat((item.Buy_Sell_Spread || "0").replace(/,/g, '')) / 1000000;
        });
        
        // Update top KPI
        const latestInfo = foreignData[foreignData.length - 1];
        const latestSpread = parseFloat((latestInfo.Buy_Sell_Spread || "0").replace(/,/g, '')) / 1000000;
        
        const kpiEl = document.getElementById('foreignCurrentValue');
        if(kpiEl) {
          kpiEl.innerText = `${latestSpread >= 0 ? '+' : ''}${latestSpread.toLocaleString(undefined, {maximumFractionDigits: 0})}`;
          kpiEl.className = `metric-value ${latestSpread >= 0 ? 'text-red' : 'text-green'}`;
        }

        drawForeignChart(labels, data);
      }
    }
  } catch(e) {
    console.warn("API Fetch failed, using fallback data for Foreign Inv", e);
    const m = generateForeignMockHistory(14);
    drawForeignChart(m.map((_, i) => `D-${14-i}`), m.map(i => i.Buy_Sell_Spread));
  } finally {
    if (loading) loading.classList.remove('active');
  }
}

// --- Chart Renderers ---

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
        tension: 0.2, // Sharper modern lines (shadcn style)
        fill: true,
        pointBackgroundColor: colors.lineBorder,
        pointBorderColor: 'hsl(0, 0%, 3.9%)', // match bg
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
        x: { grid: { display: false, drawBorder: false }, ticks: { maxTicksLimit: 7 } },
        y: {
          grid: { color: colors.grid, drawBorder: false },
          border: { dash: [4, 4] },
          min: Math.min(...data) * 0.99
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
        label: '淨買賣超 (百萬)',
        data: data,
        backgroundColor: data.map(val => val >= 0 ? colors.up : colors.down),
        borderRadius: 4,
        barPercentage: 0.6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
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

// --- Helper Functions for Fallback ---
function generateMockData(start, count, vol) {
  let labels = []; let data = []; let price = start;
  for(let i=count; i>0; i--) { labels.push(`Day ${count-i+1}`); price += (Math.random()-0.45)*vol; data.push(price.toFixed(0)); }
  return {labels, data};
}
function generateForeignMockHistory(count) {
  let res = [];
  for(let i=0; i<count; i++) { res.push({ Buy_Sell_Spread: (Math.random()-0.5)*20000 }); }
  return res;
}

// --- Populate News Feed (10 Items, <a> specific) ---

const mockNews = [
  { tag: '總體經濟', time: '10 分鐘前', title: '聯準會利率決策出爐，主席暗示今年仍有預防性降息空間', url: 'https://news.cnyes.com/' },
  { tag: '半導體', time: '18 分鐘前', title: '台積電公佈最新營收展望，AI 晶片先進製程需求全面滿載', url: 'https://money.udn.com/' },
  { tag: '籌碼動向', time: '35 分鐘前', title: '外資今日買超百億，大舉加碼金融與AI伺服器供應鏈概念股', url: 'https://tw.stock.yahoo.com/' },
  { tag: '國際地緣', time: '1 小時前', title: '地緣政治變數發酵？科技類股盤前震盪整理，市場靜待財報週', url: 'https://news.cnyes.com/' },
  { tag: '產業動態', time: '2 小時前', title: '輝達 (NVIDIA) 宣佈新一代架構投片，供應鏈台廠受惠名單大公開', url: 'https://money.udn.com/' },
  { tag: '外匯市場', time: '3 小時前', title: '新台幣盤中強勢升值5角，熱錢湧入台北匯市創本月新高', url: 'https://finance.ettoday.net/' },
  { tag: '營收速報', time: '4 小時前', title: '聯發科Q3法說會前瞻：旗艦手機晶片出貨暢旺，單季毛利率挑戰新高', url: 'https://tw.stock.yahoo.com/' },
  { tag: '綠能發電', time: '5 小時前', title: '政府宣布擴大綠能基建投資，重電族群早盤強勢亮燈漲停', url: 'https://money.udn.com/' },
  { tag: '原物料', time: '6 小時前', title: '國際金價突破歷史新高，避險資金持續湧入貴金屬市場', url: 'https://cn.reuters.com/' },
  { tag: '電動車', time: '8 小時前', title: '鴻海科技日展示多款電動新車，電動巴士訂單能見度直達年底', url: 'https://www.bnext.com.tw/' }
];

function renderNews() {
  const container = document.getElementById('newsFeedList');
  if (!container) return;
  
  let html = '';
  mockNews.forEach(news => {
    // Standard HTML <a> wrapper for perfect 100% click-through reliability
    html += `
      <a href="${news.url}" target="_blank" rel="noopener noreferrer" class="news-link">
        <div class="news-item">
          <div class="news-meta">
            <span class="news-tag">${news.tag}</span>
            <span class="news-time">${news.time}</span>
          </div>
          <h4 class="news-title">${news.title}</h4>
        </div>
      </a>
    `;
  });
  
  container.innerHTML = html;
}

// --- DOM Ready ---

document.addEventListener('DOMContentLoaded', () => {
  // Initialization calls to TWSE
  fetchTWSETaiex();
  fetchTWSEForeign();
  
  renderNews();
});
