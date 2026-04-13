/**
 * =========================================
 * TPEXplore Application Logic (FinMind API Edition)
 * =========================================
 */

// --- Global Chart.js configuration ---
Chart.defaults.color = 'hsl(0, 0%, 63.9%)'; 
Chart.defaults.font.family = "'Inter', 'Noto Sans TC', sans-serif";
Chart.defaults.plugins.tooltip.backgroundColor = 'hsl(0, 0%, 9%)';
Chart.defaults.plugins.tooltip.titleColor = 'hsl(0, 0%, 98%)';
Chart.defaults.plugins.tooltip.bodyColor = 'hsl(0, 0%, 98%)';
Chart.defaults.plugins.tooltip.padding = { top: 8, bottom: 8, left: 12, right: 12 };
Chart.defaults.plugins.tooltip.cornerRadius = 6;
Chart.defaults.plugins.tooltip.borderColor = 'hsla(0, 0%, 100%, 0.1)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.displayColors = false; 

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
let foreignRawData = []; 

// Calculate start date
const d = new Date();
d.setDate(d.getDate() - 100); 
const fallbackStartDate = d.toISOString().split('T')[0];

function updateLastUpdatedTime() {
  const timeEl = document.querySelector('.last-updated');
  if (timeEl) {
    const now = new Date();
    const hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const pad = (num) => String(num).padStart(2, '0');
    
    const timeStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${pad(displayHours)}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${ampm}`;
    timeEl.innerText = `資料最後同步時間：${timeStr}`;
  }
}

// --- Dynamic Content Store (Simulated AI Summaries) ---
const contentStoreList = [
  {
    ptt: {
      text: "近期中東局勢動盪使美股科技股走弱，連帶影響台股權值股表現。鄉民熱烈討論大盤力守三萬三千點關卡的防禦性，資金明顯由半導體流出，轉進重電、低軌衛星等傳產與政策受惠等防禦性族群，投資人情緒轉趨觀望。",
      tags: ["台積電", "重電", "低軌衛星"]
    },
    dcard: {
      text: "Dcard 近期討論度最高的莫過於台積電的法說會預期與美股財報週的聯動。許多年輕投資者對於半導體龍頭的回檔表示擔憂，但也有一派聲音認為現在是分批布局的好時機。此外，高股息 ETF 的成分股調整也是熱門話題。",
      tags: ["法說會", "高股息", "半導體"]
    },
    summary: {
      text: "以 2026 年 3 月底最新盤勢分析，台股大盤目前正試圖在三萬三千點 (33,000) 高檔區間建立支撐。受到近期國際地緣政治與美股科技類股震盪拖累，扮演穩盤重心的權值雙雄（台積電、鴻海）承受了較大的外資調節賣壓。<br><br>然而，最新市場籌碼數據顯示，避險資金正迅速進行產業輪動，包括低軌衛星、塑化原物料以及受惠於政府強韌電網政策的重電族群，成為了短線資金停泊的首選。法人指出，投資人現階段應以「居高思危」為操作原則，靜待接下來的財報效應落定。",
      tags: ["居高思危", "財報效應", "強韌電網"]
    },
    hotStocks: ["中興電 (1513)", "華城 (1519)", "台積電 (2330)", "鴻海 (2317)", "啟碁 (6285)"]
  },
  {
    ptt: {
      text: "外資連續賣超引發鄉民熱議，不少人擔憂大盤可能跌破支撐線。版上出現不少『畢業文』，但也有老手認為這只是健康的回檔。散戶目前多半還是聚焦在有高殖利率保護的金融股或者防禦性標的。",
      tags: ["外資賣超", "畢業文", "金融股"]
    },
    dcard: {
      text: "最近因為股市震盪，版上出現很多關於『該不該停損』的討論。許多存股族仍然堅持『越跌越買』的策略，尤其是針對幾檔熱門的 ETF 系列。針對 AI 伺服器概念股的熱度似乎有稍微降溫的趨勢。",
      tags: ["停損", "存股", "AI伺服器"]
    },
    summary: {
      text: "近期盤勢受到國際資金板塊移動的影響，呈現較大幅度的震盪洗盤。大盤短線跌破了月線支撐，市場資金明顯偏向保守操作。<br><br>觀察這幾日的籌碼面，外資與投信出現土洋對作的現象。展望後市，需持續關注本週即將公布的美國就業數據與通膨指標，這將直接左右下半個月的台股風向。",
      tags: ["震盪洗盤", "土洋對作", "通膨指標"]
    },
    hotStocks: ["兆豐金 (2886)", "中信金 (2891)", "元大高股息 (0056)", "國泰高股息 (00878)", "緯創 (3231)"]
  },
  {
    ptt: {
      text: "美股昨晚強勢反彈，帶動台股今日開高走高。鄉民一片歡呼，紛紛表示『舒服』、『主升段來了』。特別是 AI 相關概念股再度成為盤面焦點，資金明顯回流電子股，市場氣氛轉趨樂觀。",
      tags: ["美股反彈", "AI概念股", "電子股"]
    },
    dcard: {
      text: "大家都在討論今天台股的大漲，好多人開盤就追進去了！版上又開始熱烈討論未來的目標價，似乎上一週的陰霾一掃而空。不過還是有些人提醒不要追高，休閒等待拉回再買進比較安全。",
      tags: ["大漲", "目標價", "不要追高"]
    },
    summary: {
      text: "在美股科技巨頭財報優於預期的激勵下，台股順利突破近期的盤整區間，重新站回所有均線之上。電子權值股發揮了撐盤與領漲的雙重作用。<br><br>後續觀察重點在於成交量是否能持續溫和放大。若量能能夠配合，將有助於大盤展開新一波的多頭攻勢，投資人可留意基本面佳且具備題材性的科技類股。",
      tags: ["財報優異", "突破盤整", "多頭攻勢"]
    },
    hotStocks: ["台積電 (2330)", "廣達 (2382)", "技嘉 (2376)", "緯穎 (6669)", "奇鋐 (3017)"]
  }
];

function updateDynamicSections(isManual = false) {
  const socialLoading = document.getElementById('socialLoading');
  const summaryLoading = document.getElementById('summaryLoading');
  const socialStatus = document.getElementById('socialStatus');
  const summaryStatus = document.getElementById('summaryStatus');

  if (isManual) {
    if (socialLoading) socialLoading.classList.add('active');
    if (summaryLoading) summaryLoading.classList.add('active');
  }

  // Simulate minimal delay for "syncing" feel
  setTimeout(() => {
    const contentStore = contentStoreList[Math.floor(Math.random() * contentStoreList.length)];
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Inject PTT
    const pttEl = document.getElementById('pttContent');
    if (pttEl) {
      pttEl.innerHTML = `
        <p class="text-sm leading-relaxed" style="margin-bottom: 1rem;">${contentStore.ptt.text}</p>
        <div class="flex-row gap-8" style="margin-top: 1.25rem;">
          ${contentStore.ptt.tags.map(tag => `<div class="badge badge-red"><span>🔥</span>${tag}</div>`).join('')}
        </div>
      `;
    }

    // Inject Dcard
    const dcardEl = document.getElementById('dcardContent');
    if (dcardEl) {
      dcardEl.innerHTML = `
        <p class="text-sm leading-relaxed" style="margin-bottom: 1rem;">${contentStore.dcard.text}</p>
        <div class="flex-row gap-8" style="margin-top: 1.25rem;">
          ${contentStore.dcard.tags.map(tag => `<div class="badge badge-red"><span>🔥</span>${tag}</div>`).join('')}
        </div>
      `;
    }

    // Inject Summary
    const summaryEl = document.getElementById('marketSummaryContent');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <p class="card-description leading-relaxed text-base" style="color: hsl(var(--foreground));">${contentStore.summary.text}</p>
        <div class="flex-row gap-8" style="margin-top: 1.25rem;">
          ${contentStore.summary.tags.map(tag => `<div class="badge badge-blue">${tag}</div>`).join('')}
        </div>
      `;
    }

    // Inject Hot Stocks
    const hotStocksEl = document.getElementById('hotStocksContainer');
    if (hotStocksEl && contentStore.hotStocks) {
      hotStocksEl.innerHTML = contentStore.hotStocks.map(stock => `<div class="badge badge-blue">🔥 ${stock}</div>`).join('');
    }

    // Update Status Labels
    if (socialStatus) socialStatus.innerText = `最後同步: ${timeStr}`;
    if (summaryStatus) summaryStatus.innerText = `最後同步: ${timeStr}`;

    if (socialLoading) socialLoading.classList.remove('active');
    if (summaryLoading) summaryLoading.classList.remove('active');
  }, isManual ? 800 : 0);
}

// Hourly Timer Logic
function initHourlyTimer() {
  // 每小時 (3600000 毫秒) 自動更新一次 PTT / DCARD 區塊
  setInterval(() => {
    updateDynamicSections(true); // 帶入 true 以顯示更新動畫
  }, 3600000);
}

// --- API Fetchers (FinMind API - CORS Friendly open data) ---

async function fetchData() {
  const refreshBtn = document.getElementById('refreshBtn');
  const taiexLoading = document.getElementById('taiexLoading');
  const foreignLoading = document.getElementById('foreignLoading');
  
  if (refreshBtn) refreshBtn.classList.add('loading');
  if (taiexLoading) taiexLoading.classList.add('active');
  if (foreignLoading) foreignLoading.classList.add('active');
  
  // Trigger dynamic sections sync
  updateDynamicSections(true);

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

      // Requested: Arrow with small tail (stem) - Distinctive paths
      const upSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-red"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
      const downSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-green"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>';

      const taiexCard = document.getElementById('taiexCard');
      const taiexTrendIcon = document.getElementById('taiexTrendIcon');
      if (taiexCard) {
        taiexCard.classList.remove('is-up', 'is-down');
        if (latest.spread > 0) {
          taiexCard.classList.add('is-up');
          if (taiexTrendIcon) taiexTrendIcon.innerHTML = upSvg;
        } else if (latest.spread < 0) {
          taiexCard.classList.add('is-down');
          if (taiexTrendIcon) taiexTrendIcon.innerHTML = downSvg;
        } else {
          if (taiexTrendIcon) taiexTrendIcon.innerHTML = '';
        }

        // TAIEX Tooltip: Previous day data + Change
        const taiexTooltip = document.getElementById('taiexTooltip');
        if (taiexTooltip && prev) {
          const pct = ((latest.close - prev.close) / prev.close * 100).toFixed(2);
          const direction = latest.close >= prev.close ? '上升' : '下降';
          taiexTooltip.innerText = `前一交易日 ${prev.close.toLocaleString(undefined, {minimumFractionDigits: 2})}, ${direction} ${Math.abs(pct)}%`;
        }
      }

      // Update Volume KPI (Trading_money is total Value in NTD. Convert to 億)
      const volumeEl = document.getElementById('volumeCurrentValue');
      const volInHundredMillion = latest.Trading_money / 100000000;
      const prevVolInHundredMillion = prev ? prev.Trading_money / 100000000 : volInHundredMillion;
      if (volumeEl) volumeEl.innerText = volInHundredMillion.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});

      const volumeCard = document.getElementById('volumeCard');
      const volumeTrendIcon = document.getElementById('volumeTrendIcon');
      if (volumeCard) {
        volumeCard.classList.remove('is-up', 'is-down');
        if (volInHundredMillion > prevVolInHundredMillion) {
          volumeCard.classList.add('is-up');
          if (volumeTrendIcon) volumeTrendIcon.innerHTML = upSvg;
        } else if (volInHundredMillion < prevVolInHundredMillion) {
          volumeCard.classList.add('is-down');
          if (volumeTrendIcon) volumeTrendIcon.innerHTML = downSvg;
        } else {
          if (volumeTrendIcon) volumeTrendIcon.innerHTML = '';
        }

        // Volume Tooltip: Previous day volume + Change
        const volumeTooltip = document.getElementById('volumeTooltip');
        if (volumeTooltip && prev) {
          const pct = ((volInHundredMillion - prevVolInHundredMillion) / prevVolInHundredMillion * 100).toFixed(2);
          const direction = volInHundredMillion >= prevVolInHundredMillion ? '上升' : '下降';
          volumeTooltip.innerText = `前一交易日 ${prevVolInHundredMillion.toLocaleString(undefined, {maximumFractionDigits: 0})} 億, ${direction} ${Math.abs(pct)}%`;
        }
      }

      renderTaiexChart();
    }

    // -- 2. Process Foreign Data --
    if (foreignJson.data && foreignJson.data.length > 0) {
      foreignRawData = foreignJson.data.filter(item => item.name === 'Foreign_Investor');
      if (foreignRawData.length > 0) {
        // Initial Draw: Default to 10 days (or "1 Week" approx)
        updateForeignRange(7); 

        const latest = foreignRawData[foreignRawData.length - 1];
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

        // Foreign Tooltip: Previous day flow + Change
        const foreignTooltip = document.getElementById('foreignTooltip');
        if (foreignTooltip && foreignRawData.length > 1) {
          const prevLatest = foreignRawData[foreignRawData.length - 2];
          const prevLatestSpread = (prevLatest.buy - prevLatest.sell) / 100000000;
          const diff = latestSpreadInHundredMillion - prevLatestSpread;
          const pct = prevLatestSpread !== 0 ? ((diff / Math.abs(prevLatestSpread)) * 100).toFixed(2) : '--';
          const direction = diff >= 0 ? '增加' : '減少';
          foreignTooltip.innerText = `前一交易日 ${prevLatestSpread.toFixed(1)} 億, ${direction} ${Math.abs(diff).toFixed(1)} 億 (${pct}%)`;
        }
      }
    }

    // --- AI Recommendation Logic ---
    const aiContainer = document.getElementById('aiSignalContainer');
    if (aiContainer && taiexRawData.length > 0 && foreignRawData.length > 0) {
      const latestTaiex = taiexRawData[taiexRawData.length - 1];
      const latestForeign = foreignRawData[foreignRawData.length - 1];
      const foreignSpread = latestForeign.buy - latestForeign.sell;
      
      let signalHTML = "";
      if (latestTaiex.spread > 0 && foreignSpread > 0) {
        signalHTML = `<div class="badge badge-red" style="font-size:0.875rem; padding:6px 12px; border: 1px solid hsla(0, 84%, 60%, 0.3);">📈 強烈建議做多 (大盤上漲且外資買超)</div>`;
      } else if (latestTaiex.spread < 0 && foreignSpread < 0) {
        signalHTML = `<div class="badge badge-green" style="font-size:0.875rem; padding:6px 12px; border: 1px solid hsla(142, 71%, 45%, 0.3);">📉 建議偏空操作 (大盤下跌且外資賣超)</div>`;
      } else if (latestTaiex.spread > 0 && foreignSpread < 0) {
        signalHTML = `<div class="badge badge-blue" style="font-size:0.875rem; padding:6px 12px;">⚖️ 中立偏多 (大盤抗跌，留意主力動向)</div>`;
      } else {
        signalHTML = `<div class="badge badge-blue" style="font-size:0.875rem; padding:6px 12px;">⚖️ 中立偏空 (大盤回檔，外資低接)</div>`;
      }
      aiContainer.innerHTML = signalHTML;
    }

    // Explictly update time only when logic completes without throwing
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
    if (refreshBtn) refreshBtn.classList.remove('loading');
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
          min: Math.floor(Math.min(...data) / 100) * 100 
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

// --- Foreign Range Logic ---
function updateForeignRange(days) {
  if (!foreignRawData || foreignRawData.length === 0) return;
  
  const filtered = foreignRawData.slice(-days);
  const labels = filtered.map(item => item.date.slice(5).replace('-', '/'));
  const data = filtered.map(item => (item.buy - item.sell) / 100000000);
  
  drawForeignChart(labels, data);
}

function initRangeFilters() {
  const group = document.getElementById('foreignRangeGroup');
  if (!group) return;

  group.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;

    // UI Toggle
    group.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Logic
    const range = parseInt(btn.dataset.range);
    updateForeignRange(range);
  });
}

// --- Tab Logic ---
function initTabs() {
  const pttTabBtn = document.getElementById('pttTabBtn');
  const dcardTabBtn = document.getElementById('dcardTabBtn');
  const pttContent = document.getElementById('pttContent');
  const dcardContent = document.getElementById('dcardContent');

  if (!pttTabBtn || !dcardTabBtn) return;

  pttTabBtn.addEventListener('click', () => {
    pttTabBtn.classList.add('active');
    dcardTabBtn.classList.remove('active');
    pttContent.classList.add('active');
    dcardContent.classList.remove('active');
  });

  dcardTabBtn.addEventListener('click', () => {
    dcardTabBtn.classList.add('active');
    pttTabBtn.classList.remove('active');
    dcardContent.classList.add('active');
    pttContent.classList.remove('active');
  });
}

// --- Tooltip Mouse Tracking ---
function initTooltips() {
  const mapping = {
    'taiexCard': 'taiexTooltip',
    'volumeCard': 'volumeTooltip',
    'foreignCard': 'foreignTooltip'
  };

  Object.entries(mapping).forEach(([cardId, tooltipId]) => {
    const card = document.getElementById(cardId);
    const bubble = document.getElementById(tooltipId);
    if (!card || !bubble) return;

    card.addEventListener('mouseenter', () => {
      bubble.style.opacity = '1';
    });
    
    card.addEventListener('mouseleave', () => {
      bubble.style.opacity = '0';
    });

    card.addEventListener('mousemove', (e) => {
      // Offset by 15px to avoid jumping or covering the cursor
      bubble.style.left = (e.clientX + 15) + 'px';
      bubble.style.top = (e.clientY + 15) + 'px';
    });
  });
}

// --- DOM Ready ---
document.addEventListener('DOMContentLoaded', () => {
  fetchData();
  initTabs();
  initTooltips();
  initRangeFilters();
  initHourlyTimer();

  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => fetchData());
  }
});
