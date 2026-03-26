/**
 * =========================================
 * Taiwan Stock Dashboard Application Logic
 * =========================================
 */

// --- Global Chart.js configuration ---
Chart.defaults.color = '#8e8e8e'; // text-muted
Chart.defaults.font.family = "'Inter', 'Noto Sans TC', sans-serif";
Chart.defaults.plugins.tooltip.backgroundColor = '#2f2f2f'; // bg-panel
Chart.defaults.plugins.tooltip.titleColor = '#f9f9f9';
Chart.defaults.plugins.tooltip.bodyColor = '#f9f9f9';
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.1)';
Chart.defaults.plugins.tooltip.borderWidth = 1;

// Colors matching CSS variables for Taiwan Market logic (Red = Up/Buy, Green = Down/Sell)
const colors = {
  up: '#ef4444',      // Softer Red (Buy/Rise)
  down: '#10b981',    // Softer Green (Sell/Fall)
  grid: 'rgba(255, 255, 255, 0.05)',
  lineFill: 'rgba(255, 255, 255, 0.03)', // Neutral gray fill
  lineBorder: '#a0a0a0', // Neutral gray border instead of blue
};

// --- Mock Data Generators ---

/**
 * Generate historical TAIEX (Taiwan Capitalization Weighted Stock Index) dummy data
 */
function generateTaiexData() {
  const labels = [];
  const data = [];
  let currentPrice = 33000; // Baseline at 33,000 as requested
  
  // Generate 30 days of mock data
  for (let i = 30; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    
    // random walk
    const change = (Math.random() - 0.45) * 200; 
    currentPrice += change;
    data.push(currentPrice.toFixed(0));
  }
  
  // Update HTML display value with the final generated current price
  const taiexDisplay = document.getElementById('taiexCurrentValue');
  if(taiexDisplay) taiexDisplay.innerText = Number(data[data.length - 1]).toLocaleString();

  return { labels, data };
}

/**
 * Generate Foreign Investors Buy/Sell mock data
 */
function generateForeignData(type = 'daily') {
  const labels = [];
  const data = [];
  const count = type === 'daily' ? 14 : 12; // 14 days or 12 months
  
  for (let i = count; i > 0; i--) {
    if (type === 'daily') {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    } else {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      labels.push(`${d.getMonth() + 1}月`);
    }
    
    // Value represents billions (NTD)
    // Daily is smaller +/- 200, Monthly is larger +/- 1500
    const magnitude = type === 'daily' ? 150 : 1000;
    const val = (Math.random() - 0.5) * 2 * magnitude;
    data.push(val.toFixed(1));
  }
  return { labels, data };
}


// --- Initialize Charts ---

let taiexChartInstance = null;
let foreignChartInstance = null;

function initTaiexChart() {
  const ctx = document.getElementById('taiexChart').getContext('2d');
  const taiexData = generateTaiexData();

  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, colors.lineFill);
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  taiexChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: taiexData.labels,
      datasets: [{
        label: '加權指數',
        data: taiexData.data,
        borderColor: colors.lineBorder,
        backgroundColor: gradient,
        borderWidth: 2,
        tension: 0.4, // smooth curve
        fill: true,
        pointBackgroundColor: colors.lineBorder,
        pointBorderColor: '#212121',
        pointBorderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false, drawBorder: false },
          ticks: { maxTicksLimit: 7 }
        },
        y: {
          grid: { color: colors.grid, drawBorder: false },
          border: { dash: [5, 5] },
          // Don't start at zero for stock index
          min: 32000, 
        }
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
    }
  });
}

function initForeignChart() {
  const ctx = document.getElementById('foreignChart').getContext('2d');
  const dataObj = generateForeignData('daily');

  foreignChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dataObj.labels,
      datasets: [{
        label: '買賣超 (億)',
        data: dataObj.data,
        backgroundColor: dataObj.data.map(val => val >= 0 ? colors.up : colors.down),
        borderRadius: 4,
        barPercentage: 0.6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              let val = context.raw;
              return ` ${val >= 0 ? '+' : ''}${val} 億`;
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false, drawBorder: false } },
        y: {
          grid: { color: colors.grid, drawBorder: true, borderColor: colors.grid },
          border: { dash: [5, 5] }
        }
      }
    }
  });
}

// Update Foreign Chart on button click
function updateForeignChart(type) {
  if (!foreignChartInstance) return;
  const newData = generateForeignData(type);
  
  foreignChartInstance.data.labels = newData.labels;
  foreignChartInstance.data.datasets[0].data = newData.data;
  foreignChartInstance.data.datasets[0].backgroundColor = newData.data.map(val => val >= 0 ? colors.up : colors.down);
  
  foreignChartInstance.update();
}

// --- Populate News Feed (10 Items) ---

const mockNews = [
  { tag: '總體經濟', time: '10 分鐘前', title: '聯準會利率決策出爐，主席暗示今年仍有預防性降息空間', url: 'https://news.cnyes.com/' },
  { tag: '半導體', time: '18 分鐘前', title: '台積電公佈最新營收展望，AI 晶片先進製程需求全面滿載', url: 'https://money.udn.com/' },
  { tag: '籌碼動向', time: '35 分鐘前', title: '外資今日買超125億，大舉加碼金融與AI伺服器供應鏈概念股', url: 'https://tw.stock.yahoo.com/' },
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
    html += `
      <div class="news-item" onclick="window.open('${news.url}', '_blank')">
        <div class="news-meta">
          <span class="news-tag">${news.tag}</span>
          <span class="time">${news.time}</span>
        </div>
        <h4 class="news-title">${news.title}</h4>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

// --- DOM Ready ---

document.addEventListener('DOMContentLoaded', () => {
  initTaiexChart();
  initForeignChart();
  renderNews();
  
  // Setup event listeners for chart toggle
  const btnDaily = document.getElementById('btnDaily');
  const btnMonthly = document.getElementById('btnMonthly');
  
  if (btnDaily && btnMonthly) {
    btnDaily.addEventListener('click', () => {
      btnDaily.classList.add('active');
      btnMonthly.classList.remove('active');
      updateForeignChart('daily');
    });
    
    btnMonthly.addEventListener('click', () => {
      btnMonthly.classList.add('active');
      btnDaily.classList.remove('active');
      updateForeignChart('monthly');
    });
  }
  
  // Filter buttons for Taiex (visual only for mock)
  const filters = document.querySelectorAll('.chart-container:first-of-type .filter-btn');
  filters.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filters.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      if (taiexChartInstance) {
        taiexChartInstance.data.datasets[0].data = generateTaiexData().data;
        taiexChartInstance.update();
      }
    });
  });
});
