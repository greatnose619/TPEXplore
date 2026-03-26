/**
 * =========================================
 * Taiwan Stock Dashboard Application Logic
 * =========================================
 */

// --- Global Chart.js configuration ---
Chart.defaults.color = '#94a3b8'; // text-secondary
Chart.defaults.font.family = "'Inter', 'Noto Sans TC', sans-serif";
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.9)';
Chart.defaults.plugins.tooltip.titleColor = '#f8fafc';
Chart.defaults.plugins.tooltip.bodyColor = '#f8fafc';
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.1)';
Chart.defaults.plugins.tooltip.borderWidth = 1;

// Colors matching CSS variables for Taiwan Market logic (Red = Up/Buy, Green = Down/Sell)
const colors = {
  up: '#ff4d4f',      // Red (Buy/Rise)
  down: '#22c55e',    // Green (Sell/Fall)
  grid: 'rgba(255, 255, 255, 0.05)',
  lineFill: 'rgba(59, 130, 246, 0.1)',
  lineBorder: '#3b82f6',
};

// --- Mock Data Generators ---

/**
 * Generate historical TAIEX (Taiwan Capitalization Weighted Stock Index) dummy data
 */
function generateTaiexData() {
  const labels = [];
  const data = [];
  let currentPrice = 19500;
  
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
  gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

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
        pointBorderColor: '#0b0f19',
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
          min: 19000, 
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

// --- Populate News Feed ---

const mockNews = [
  { tag: '總體經濟', time: '10 分鐘前', title: '聯準會 (Fed) 利率決策出爐，主席暗示今年仍有降息空間', type: 'global' },
  { tag: '半導體', time: '30 分鐘前', title: '台積電公佈最新法說會營收展望，AI 晶片需求持續強勁', type: 'local' },
  { tag: '籌碼動向', time: '1 小時前', title: '外資今日買超125億，大舉加碼金融與AI伺服器概念股', type: 'local' },
  { tag: '國際地緣', time: '2 小時前', title: '美中貿易新禁令影響？科技類股盤前震盪整理', type: 'global' },
  { tag: '產業鏈', time: '3 小時前', title: '輝達 (NVIDIA) 宣佈新一代架構投片，供應鏈台廠受惠名單大公開', type: 'local' },
  { tag: '外匯市場', time: '5 小時前', title: '新台幣早盤強勢升值5角，熱錢湧入台北匯市', type: 'global' }
];

function renderNews() {
  const container = document.getElementById('newsFeedList');
  if (!container) return;
  
  let html = '';
  mockNews.forEach(news => {
    html += `
      <div class="news-item">
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
  // 1. Render charts
  initTaiexChart();
  initForeignChart();
  
  // 2. Render News
  renderNews();
  
  // 3. Setup event listeners for chart toggle (Daily vs Monthly)
  const btnDaily = document.getElementById('btnDaily');
  const btnMonthly = document.getElementById('btnMonthly');
  
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
  
  // Filter buttons for Taiex (visual only for mock)
  const filters = document.querySelectorAll('.chart-container:first-of-type .filter-btn');
  filters.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filters.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      // Simulate data reload
      taiexChartInstance.data.datasets[0].data = generateTaiexData().data;
      taiexChartInstance.update();
    });
  });
});
