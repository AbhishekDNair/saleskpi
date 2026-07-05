/* ============================================================
   SALES PERFORMANCE DASHBOARD - APPLICATION LOGIC
   app.js
   ============================================================ */

'use strict';

// ============================================================
// SECTION 1: DATA GENERATION ENGINE
// ============================================================

const SALESPEOPLE = [
  { id: 'SP01', name: 'Alexandra Chen',    avatar: '#2563eb' },
  { id: 'SP02', name: 'Marcus Williams',   avatar: '#10b981' },
  { id: 'SP03', name: 'Sophia Rodriguez',  avatar: '#8b5cf6' },
  { id: 'SP04', name: 'James Okonkwo',     avatar: '#f59e0b' },
  { id: 'SP05', name: 'Priya Sharma',      avatar: '#ef4444' },
  { id: 'SP06', name: 'Ethan Nakamura',    avatar: '#06b6d4' },
  { id: 'SP07', name: 'Isabella Torres',   avatar: '#ec4899' },
  { id: 'SP08', name: 'Noah Anderson',     avatar: '#84cc16' },
  { id: 'SP09', name: 'Aisha Patel',       avatar: '#f97316' },
  { id: 'SP10', name: 'Ryan O\'Brien',     avatar: '#6366f1' },
];

const REGIONS = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East'];
const CATEGORIES = ['Software', 'Hardware', 'Services', 'Cloud', 'Support'];
const SEGMENTS = ['Enterprise', 'SMB', 'Mid-Market', 'Startup'];
const CHANNELS = ['Direct', 'Partner', 'Online', 'Inbound'];
const STATUSES = ['Closed Won', 'Closed Won', 'Closed Won', 'Pipeline', 'Lost'];

const PRODUCTS = {
  Software:  ['CRM Suite Pro', 'Analytics Engine', 'AutoFlow Platform', 'SecureVault', 'DataSync Pro'],
  Hardware:  ['ServerEdge 5000', 'UltraBook X1', 'NAS Gateway', 'EdgeCompute Unit', 'SmartHub 360'],
  Services:  ['Premium Support', 'Implementation Pkg', 'Training Bundle', 'Consulting Retainer', 'SLA Boost'],
  Cloud:     ['CloudHost Elite', 'Hybrid Cloud Mgr', 'Disaster Recovery', 'Multi-Region CDN', 'AI Inference API'],
  Support:   ['24/7 SupportDesk', 'Onboarding Pack', 'Success Manager', 'Dev Ops Shield', 'Global Coverage'],
};

const CUSTOMERS = [
  'Apex Industries','Vertex Corp','Quantum Dynamics','Nexus Global','Pinnacle Systems',
  'Titan Enterprises','Eclipse Tech','Nova Solutions','Orbit Analytics','Summit Holdings',
  'Cascade Ventures','Meridian Partners','Zenith Technologies','Polaris Innovations','Aura Digital',
  'BlueSky Financials','Redwood Capital','Ironclad Security','Stellar Media','Harbor Logistics',
  'Capstone Energy','Frontier Manufacturing','Coastal Retail','Skyline Healthcare','Alpine Finance',
  'Ember Consulting','Forge Dynamics','Granite Solutions','Haven Insurance','Ivory Analytics',
];

function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

function generateTransactions(count = 1200) {
  const data = [];
  const now = new Date(2026, 5, 30); // June 30, 2026
  const start = new Date(2025, 6, 1); // July 1, 2025
  const totalMs = now - start;

  for (let i = 0; i < count; i++) {
    const date = new Date(start.getTime() + rand(0, totalMs));
    const category = pick(CATEGORIES);
    const product = pick(PRODUCTS[category]);
    const salesperson = pick(SALESPEOPLE);
    const statusRaw = pick(STATUSES);
    const region = pick(REGIONS);
    const segment = pick(SEGMENTS);
    const channel = pick(CHANNELS);

    // Revenue ranges by category
    const revenueRanges = {
      Software: [5000, 80000],
      Hardware: [2000, 45000],
      Services: [3000, 60000],
      Cloud:    [4000, 100000],
      Support:  [1000, 25000],
    };

    const [rMin, rMax] = revenueRanges[category];
    const revenue = parseFloat(rand(rMin, rMax).toFixed(2));
    const costRatio = rand(0.35, 0.65);
    const cost = parseFloat((revenue * costRatio).toFixed(2));

    data.push({
      orderId: `ORD-${(10000 + i).toString()}`,
      date,
      dateStr: date.toISOString().slice(0, 10),
      customer: pick(CUSTOMERS),
      product,
      category,
      salesperson: salesperson.name,
      salespersonId: salesperson.id,
      salespersonColor: salesperson.avatar,
      region,
      segment,
      channel,
      revenue,
      cost,
      profit: parseFloat((revenue - cost).toFixed(2)),
      status: statusRaw,
      month: date.getMonth(),
      year: date.getFullYear(),
      dayOfYear: Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000),
    });
  }

  // Sort by date desc
  data.sort((a, b) => b.date - a.date);
  return data;
}

const RAW_DATA = generateTransactions(1200);

// Populate salesperson filter
const allSalespeople = [...new Set(RAW_DATA.map(d => d.salesperson))].sort();
const spSelect = document.getElementById('filterSalesperson');
allSalespeople.forEach(name => {
  const o = document.createElement('option');
  o.value = name; o.textContent = name;
  spSelect.appendChild(o);
});

// ============================================================
// SECTION 2: STATE MANAGEMENT
// ============================================================

const state = {
  period:      'this_year',
  region:      'all',
  category:    'all',
  salesperson: 'all',
  segment:     'all',
  channel:     'all',
  tableSearch: '',
  tablePage:   1,
  tableSort:   { key: 'date', dir: 'desc' },
  monthlyTrendType: 'revenue',
  categoryChartType: 'stacked',
  darkMode: false,
};

// ============================================================
// SECTION 3: FILTER & DERIVE DATA
// ============================================================

function getPeriodBounds(period) {
  const now = new Date(2026, 5, 30);
  let start;
  switch (period) {
    case 'last_month':
      start = new Date(2026, 4, 1); break;
    case 'last_3m':
      start = new Date(2026, 3, 1); break;
    case 'last_6m':
      start = new Date(2025, 12, 1); break;
    case 'this_quarter':
      start = new Date(2026, 3, 1); break;
    case 'ytd':
      start = new Date(2026, 0, 1); break;
    default: // this_year / 12 months
      start = new Date(2025, 6, 1); break;
  }
  return { start, end: now };
}

function getPrevPeriodBounds(period) {
  const { start, end } = getPeriodBounds(period);
  const diff = end - start;
  return { start: new Date(start - diff), end: new Date(start) };
}

function filterData(data, overrides = {}) {
  const s = { ...state, ...overrides };
  const { start, end } = getPeriodBounds(s.period);

  return data.filter(d => {
    if (d.date < start || d.date > end) return false;
    if (s.region !== 'all' && d.region !== s.region) return false;
    if (s.category !== 'all' && d.category !== s.category) return false;
    if (s.salesperson !== 'all' && d.salesperson !== s.salesperson) return false;
    if (s.segment !== 'all' && d.segment !== s.segment) return false;
    if (s.channel !== 'all' && d.channel !== s.channel) return false;
    return true;
  });
}

// ============================================================
// SECTION 4: METRICS CALCULATION
// ============================================================

function calcMetrics(filtered) {
  const won = filtered.filter(d => d.status === 'Closed Won');
  const pipeline = filtered.filter(d => d.status === 'Pipeline');
  const lost = filtered.filter(d => d.status === 'Lost');

  const totalRevenue = won.reduce((s, d) => s + d.revenue, 0);
  const totalProfit  = won.reduce((s, d) => s + d.profit, 0);
  const totalSales   = won.length;
  const aov          = totalSales ? totalRevenue / totalSales : 0;
  const totalLeads   = filtered.length;
  const convRate     = totalLeads ? (won.length / totalLeads) * 100 : 0;
  const pipelineVal  = pipeline.reduce((s, d) => s + d.revenue, 0);
  const lostCount    = lost.length;
  const lostAvgDeal  = lostCount ? lost.reduce((s, d) => s + d.revenue, 0) / lostCount : 0;

  // Repeat customers
  const custCounts = {};
  won.forEach(d => { custCounts[d.customer] = (custCounts[d.customer] || 0) + 1; });
  const repeatCust = Object.values(custCounts).filter(c => c > 1).length;
  const totalCust  = Object.keys(custCounts).length;
  const repeatPct  = totalCust ? (repeatCust / totalCust) * 100 : 0;

  return {
    totalRevenue, totalProfit, totalSales, aov, convRate,
    pipelineVal, pipelineCount: pipeline.length,
    lostCount, lostAvgDeal, repeatPct,
    totalLeads,
  };
}

function calcGrowth(filtered) {
  const prevFiltered = filterPrevPeriod();
  const curr = filtered.filter(d => d.status === 'Closed Won').reduce((s, d) => s + d.revenue, 0);
  const prev = prevFiltered.filter(d => d.status === 'Closed Won').reduce((s, d) => s + d.revenue, 0);
  return prev ? ((curr - prev) / prev) * 100 : 0;
}

function filterPrevPeriod() {
  const { start, end } = getPrevPeriodBounds(state.period);
  return RAW_DATA.filter(d => {
    if (d.date < start || d.date > end) return false;
    if (state.region !== 'all' && d.region !== state.region) return false;
    if (state.category !== 'all' && d.category !== state.category) return false;
    if (state.salesperson !== 'all' && d.salesperson !== state.salesperson) return false;
    if (state.segment !== 'all' && d.segment !== state.segment) return false;
    if (state.channel !== 'all' && d.channel !== state.channel) return false;
    return true;
  });
}

// ============================================================
// SECTION 5: CHART.JS DEFAULTS & UTILITIES
// ============================================================

function getThemeColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    tick: isDark ? '#64748b' : '#94a3b8',
    tooltip: { bg: isDark ? '#0f1729' : '#1e293b', border: isDark ? '#1e3a5f' : '#334155' },
  };
}

const PALETTE = ['#2563eb','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16','#f97316','#6366f1'];
const CAT_COLORS = { Software:'#2563eb', Hardware:'#f59e0b', Services:'#10b981', Cloud:'#8b5cf6', Support:'#06b6d4' };
const REG_COLORS = { 'North America':'#2563eb','Europe':'#10b981','Asia Pacific':'#8b5cf6','Latin America':'#f59e0b','Middle East':'#ef4444' };

function commonAxisOpts() {
  const t = getThemeColors();
  return {
    grid: { color: t.grid, drawTicks: false },
    ticks: { color: t.tick, font: { family: "'Inter', sans-serif", size: 11 }, padding: 6 },
    border: { display: false },
  };
}

function commonTooltipOpts() {
  const t = getThemeColors();
  return {
    backgroundColor: t.tooltip.bg,
    borderColor: t.tooltip.border,
    borderWidth: 1,
    titleColor: '#f1f5f9',
    bodyColor: '#94a3b8',
    padding: 12,
    cornerRadius: 8,
    titleFont: { family: "'Inter', sans-serif", size: 12, weight: '600' },
    bodyFont: { family: "'Inter', sans-serif", size: 11 },
    displayColors: true,
    boxWidth: 8, boxHeight: 8, boxPadding: 4,
  };
}

Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;

// ============================================================
// SECTION 6: MONTHLY TREND CHART
// ============================================================

let chartMonthlyTrend = null;

function getMonthlyData(filtered, type) {
  const { start } = getPeriodBounds(state.period);
  const won = filtered.filter(d => d.status === 'Closed Won');
  const months = [];
  const values = [];
  const forecasts = [];

  // Build 12 months from start
  for (let i = 0; i < 12; i++) {
    const mDate = new Date(start.getFullYear(), start.getMonth() + i, 1);
    if (mDate > new Date(2026, 5, 30)) break;
    const label = mDate.toLocaleString('en-US', { month: 'short', year: '2-digit' });
    months.push(label);

    const inMonth = won.filter(d => d.date.getMonth() === mDate.getMonth() && d.date.getFullYear() === mDate.getFullYear());
    let val = 0;
    if (type === 'revenue') val = inMonth.reduce((s, d) => s + d.revenue, 0);
    else if (type === 'volume') val = inMonth.length;
    else if (type === 'profit') val = inMonth.reduce((s, d) => s + d.profit, 0);
    values.push(parseFloat(val.toFixed(0)));

    // Simple linear forecast
    const forecastVal = val * rand(0.95, 1.18);
    forecasts.push(parseFloat(forecastVal.toFixed(0)));
  }
  return { months, values, forecasts };
}

function renderMonthlyTrend(filtered) {
  const { months, values, forecasts } = getMonthlyData(filtered, state.monthlyTrendType);
  const ctx = document.getElementById('chartMonthlyTrend').getContext('2d');
  const fmt = state.monthlyTrendType === 'volume' ? v => v.toLocaleString() : v => '$' + fmtCompact(v);

  const datasets = [
    {
      label: 'Actual',
      data: values,
      borderColor: '#2563eb',
      backgroundColor: createGradient(ctx, '#2563eb', 0.15, 0.01),
      borderWidth: 2.5,
      pointRadius: 4,
      pointHoverRadius: 7,
      pointBackgroundColor: '#2563eb',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      fill: true,
      tension: 0.4,
    },
    {
      label: 'Forecast',
      data: forecasts,
      borderColor: '#8b5cf6',
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderDash: [6, 4],
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: '#8b5cf6',
      fill: false,
      tension: 0.4,
    },
  ];

  if (chartMonthlyTrend) {
    chartMonthlyTrend.data.labels = months;
    chartMonthlyTrend.data.datasets[0].data = values;
    chartMonthlyTrend.data.datasets[1].data = forecasts;
    chartMonthlyTrend.options.scales.y.ticks.callback = v => fmt(v);
    chartMonthlyTrend.options.plugins.tooltip.callbacks.label = ctx2 => `${ctx2.dataset.label}: ${fmt(ctx2.raw)}`;
    chartMonthlyTrend.update('active');
    return;
  }

  chartMonthlyTrend = new Chart(ctx, {
    type: 'line',
    data: { labels: months, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', align: 'end', labels: { color: getThemeColors().tick, boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
        tooltip: { ...commonTooltipOpts(), callbacks: { label: ctx2 => `${ctx2.dataset.label}: ${fmt(ctx2.raw)}` } },
      },
      scales: {
        x: { ...commonAxisOpts() },
        y: { ...commonAxisOpts(), ticks: { ...commonAxisOpts().ticks, callback: v => fmt(v) } },
      },
      interaction: { mode: 'index', intersect: false },
      animation: { duration: 600, easing: 'easeInOutCubic' },
    },
  });
}

function createGradient(ctx, color, alphaTop = 0.3, alphaBottom = 0.02) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  gradient.addColorStop(0, `rgba(${r},${g},${b},${alphaTop})`);
  gradient.addColorStop(1, `rgba(${r},${g},${b},${alphaBottom})`);
  return gradient;
}

// ============================================================
// SECTION 7: CATEGORY STACKED BAR CHART
// ============================================================

let chartCategory = null;

function getCategoryData(filtered) {
  const months = [];
  const { start } = getPeriodBounds(state.period);
  const won = filtered.filter(d => d.status === 'Closed Won');

  for (let i = 0; i < 12; i++) {
    const mDate = new Date(start.getFullYear(), start.getMonth() + i, 1);
    if (mDate > new Date(2026, 5, 30)) break;
    months.push(mDate.toLocaleString('en-US', { month: 'short' }));
  }

  const datasets = CATEGORIES.map(cat => ({
    label: cat,
    data: months.map((_, i) => {
      const mDate = new Date(start.getFullYear(), start.getMonth() + i, 1);
      return won
        .filter(d => d.category === cat && d.date.getMonth() === mDate.getMonth() && d.date.getFullYear() === mDate.getFullYear())
        .reduce((s, d) => s + d.revenue, 0);
    }),
    backgroundColor: CAT_COLORS[cat],
    borderRadius: 3,
    borderSkipped: false,
  }));

  return { months, datasets };
}

function renderCategoryChart(filtered) {
  const { months, datasets } = getCategoryData(filtered);
  const ctx = document.getElementById('chartCategory').getContext('2d');
  const isStacked = state.categoryChartType === 'stacked';

  if (chartCategory) {
    chartCategory.data.labels = months;
    chartCategory.data.datasets = datasets;
    chartCategory.options.scales.x.stacked = isStacked;
    chartCategory.options.scales.y.stacked = isStacked;
    chartCategory.update('active');
    return;
  }

  chartCategory = new Chart(ctx, {
    type: 'bar',
    data: { labels: months, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', align: 'end', labels: { color: getThemeColors().tick, boxWidth: 10, font: { size: 11 } } },
        tooltip: { ...commonTooltipOpts(), callbacks: { label: c => `${c.dataset.label}: $${fmtCompact(c.raw)}` } },
      },
      scales: {
        x: { ...commonAxisOpts(), stacked: isStacked },
        y: { ...commonAxisOpts(), stacked: isStacked, ticks: { ...commonAxisOpts().ticks, callback: v => '$' + fmtCompact(v) } },
      },
      animation: { duration: 600 },
      onClick(evt) {
        const pts = chartCategory.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
        if (!pts.length) return;
        const cat = datasets[pts[0].datasetIndex].label;
        applyFilter('category', cat);
      },
    },
  });
}

// ============================================================
// SECTION 8: REGION CHART
// ============================================================

let chartRegion = null;

function renderRegionChart(filtered) {
  const won = filtered.filter(d => d.status === 'Closed Won');
  const revenueByRegion = {};
  REGIONS.forEach(r => { revenueByRegion[r] = 0; });
  won.forEach(d => { revenueByRegion[d.region] = (revenueByRegion[d.region] || 0) + d.revenue; });

  const sorted = Object.entries(revenueByRegion).sort((a, b) => b[1] - a[1]);
  const labels = sorted.map(e => e[0]);
  const values = sorted.map(e => e[1]);
  const colors = labels.map(l => REG_COLORS[l]);

  const ctx = document.getElementById('chartRegion').getContext('2d');

  if (chartRegion) {
    chartRegion.data.labels = labels;
    chartRegion.data.datasets[0].data = values;
    chartRegion.data.datasets[0].backgroundColor = colors;
    chartRegion.update('active');
    return;
  }

  chartRegion = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Revenue',
        data: values,
        backgroundColor: colors,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { ...commonTooltipOpts(), callbacks: { label: c => `Revenue: $${fmtCompact(c.raw)}` } },
      },
      scales: {
        x: { ...commonAxisOpts(), ticks: { ...commonAxisOpts().ticks, callback: v => '$' + fmtCompact(v) } },
        y: { ...commonAxisOpts() },
      },
      animation: { duration: 600 },
      onClick(evt) {
        const pts = chartRegion.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
        if (!pts.length) return;
        const region = labels[pts[0].index];
        applyFilter('region', region);
      },
    },
  });
}

// ============================================================
// SECTION 9: TOP 10 PRODUCTS
// ============================================================

let chartTopProducts = null;

function renderTopProducts(filtered) {
  const won = filtered.filter(d => d.status === 'Closed Won');
  const rev = {};
  won.forEach(d => { rev[d.product] = (rev[d.product] || 0) + d.revenue; });

  const sorted = Object.entries(rev).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const labels = sorted.map(e => e[0]);
  const values = sorted.map(e => e[1]);

  const ctx = document.getElementById('chartTopProducts').getContext('2d');

  if (chartTopProducts) {
    chartTopProducts.data.labels = labels;
    chartTopProducts.data.datasets[0].data = values;
    chartTopProducts.update('active');
    return;
  }

  chartTopProducts = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Revenue',
        data: values,
        backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length] + 'cc'),
        hoverBackgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
        borderRadius: 5,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { ...commonTooltipOpts(), callbacks: { label: c => `$${fmtCompact(c.raw)}` } },
      },
      scales: {
        x: { ...commonAxisOpts(), ticks: { ...commonAxisOpts().ticks, callback: v => '$' + fmtCompact(v) } },
        y: { ...commonAxisOpts(), ticks: { ...commonAxisOpts().ticks, font: { size: 10.5 } } },
      },
      animation: { duration: 500 },
    },
  });
}

// ============================================================
// SECTION 10: SALES FUNNEL
// ============================================================

function renderFunnel(filtered) {
  const total = filtered.length;
  const qualified = Math.floor(total * rand(0.68, 0.78));
  const proposal  = Math.floor(qualified * rand(0.58, 0.70));
  const negotiation = Math.floor(proposal * rand(0.52, 0.65));
  const closedWon = filtered.filter(d => d.status === 'Closed Won').length;

  const stages = [
    { label: 'Leads',       count: total,        color: '#2563eb' },
    { label: 'Qualified',   count: qualified,    color: '#8b5cf6' },
    { label: 'Proposal',    count: proposal,     color: '#f59e0b' },
    { label: 'Negotiation', count: negotiation,  color: '#f97316' },
    { label: 'Closed Won',  count: closedWon,    color: '#10b981' },
  ];

  document.getElementById('funnelTotal').textContent = `${total.toLocaleString()} total leads`;

  const container = document.getElementById('salesFunnel');
  container.innerHTML = '';

  stages.forEach(stage => {
    const pct = total ? (stage.count / total) * 100 : 0;
    const div = document.createElement('div');
    div.className = 'funnel-stage';
    div.innerHTML = `
      <span class="funnel-label">${stage.label}</span>
      <div class="funnel-bar-wrap">
        <div class="funnel-bar" style="width:${pct}%;background:${stage.color};">
          ${pct > 15 ? stage.count.toLocaleString() : ''}
        </div>
      </div>
      <span class="funnel-value">${stage.count.toLocaleString()}</span>
      <span class="funnel-pct">${pct.toFixed(1)}%</span>
    `;
    container.appendChild(div);
  });
}

// ============================================================
// SECTION 11: CONVERSION RATE BY SALESPERSON
// ============================================================

let chartSalespersonConv = null;

function renderSalespersonConv(filtered) {
  const spData = {};
  SALESPEOPLE.forEach(sp => { spData[sp.name] = { total: 0, won: 0 }; });
  filtered.forEach(d => {
    if (!spData[d.salesperson]) spData[d.salesperson] = { total: 0, won: 0 };
    spData[d.salesperson].total++;
    if (d.status === 'Closed Won') spData[d.salesperson].won++;
  });

  const sorted = Object.entries(spData)
    .filter(e => e[1].total > 0)
    .map(([name, d]) => ({ name: name.split(' ')[0], rate: d.total ? (d.won / d.total) * 100 : 0 }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10);

  const labels = sorted.map(e => e.name);
  const values = sorted.map(e => parseFloat(e.rate.toFixed(1)));

  const ctx = document.getElementById('chartSalespersonConv').getContext('2d');

  if (chartSalespersonConv) {
    chartSalespersonConv.data.labels = labels;
    chartSalespersonConv.data.datasets[0].data = values;
    chartSalespersonConv.update('active');
    return;
  }

  chartSalespersonConv = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Win Rate %',
        data: values,
        backgroundColor: values.map(v => v >= 50 ? '#10b981cc' : v >= 35 ? '#f59e0bcc' : '#ef4444cc'),
        hoverBackgroundColor: values.map(v => v >= 50 ? '#10b981' : v >= 35 ? '#f59e0b' : '#ef4444'),
        borderRadius: 5,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { ...commonTooltipOpts(), callbacks: { label: c => `Win Rate: ${c.raw}%` } },
      },
      scales: {
        x: { ...commonAxisOpts() },
        y: { ...commonAxisOpts(), max: 100, ticks: { ...commonAxisOpts().ticks, callback: v => v + '%' } },
      },
      animation: { duration: 500 },
    },
  });
}

// ============================================================
// SECTION 12: BULLET CHART (Revenue vs Target)
// ============================================================

function renderBulletChart(filtered) {
  const won = filtered.filter(d => d.status === 'Closed Won');
  const container = document.getElementById('bulletChart');
  container.innerHTML = '';

  const regionData = {};
  REGIONS.forEach(r => { regionData[r] = 0; });
  won.forEach(d => { regionData[d.region] = (regionData[d.region] || 0) + d.revenue; });

  const sorted = Object.entries(regionData).sort((a, b) => b[1] - a[1]);
  const maxVal = Math.max(...sorted.map(e => e[1])) * 1.25;

  sorted.forEach(([region, actual]) => {
    const target = actual * rand(0.85, 1.30);
    const actualPct = (actual / maxVal) * 100;
    const targetPct = (target / maxVal) * 100;
    const isOver = actual >= target;

    const row = document.createElement('div');
    row.className = 'bullet-row';
    row.innerHTML = `
      <div class="bullet-label">
        <span>${region}</span>
        <span style="color:${isOver ? 'var(--success)' : 'var(--danger)'};">
          $${fmtCompact(actual)} / $${fmtCompact(target)}
        </span>
      </div>
      <div class="bullet-bar-wrap">
        <div class="bullet-range" style="width:100%;background:var(--bg-hover);"></div>
        <div class="bullet-range" style="width:${Math.min(targetPct * 1.1, 100)}%;background:${isOver ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)'};"></div>
        <div class="bullet-actual" style="width:${Math.min(actualPct, 98)}%;background:${isOver ? 'var(--success)' : 'var(--primary)'};"></div>
        <div class="bullet-target-line" style="left:${Math.min(targetPct, 98)}%;"></div>
      </div>
    `;
    container.appendChild(row);
  });
}

// ============================================================
// SECTION 13: PROFIT MARGIN TREND (Area)
// ============================================================

let chartProfitMargin = null;

function renderProfitMarginChart(filtered) {
  const won = filtered.filter(d => d.status === 'Closed Won');
  const { start } = getPeriodBounds(state.period);
  const months = [];
  const margins = [];

  for (let i = 0; i < 12; i++) {
    const mDate = new Date(start.getFullYear(), start.getMonth() + i, 1);
    if (mDate > new Date(2026, 5, 30)) break;
    months.push(mDate.toLocaleString('en-US', { month: 'short' }));
    const inMonth = won.filter(d => d.date.getMonth() === mDate.getMonth() && d.date.getFullYear() === mDate.getFullYear());
    const rev = inMonth.reduce((s, d) => s + d.revenue, 0);
    const profit = inMonth.reduce((s, d) => s + d.profit, 0);
    margins.push(rev ? parseFloat(((profit / rev) * 100).toFixed(1)) : 0);
  }

  const ctx = document.getElementById('chartProfitMargin').getContext('2d');

  if (chartProfitMargin) {
    chartProfitMargin.data.labels = months;
    chartProfitMargin.data.datasets[0].data = margins;
    chartProfitMargin.update('active');
    return;
  }

  chartProfitMargin = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Profit Margin %',
        data: margins,
        borderColor: '#10b981',
        backgroundColor: createGradient(ctx, '#10b981', 0.2, 0.01),
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { ...commonTooltipOpts(), callbacks: { label: c => `Margin: ${c.raw}%` } },
      },
      scales: {
        x: { ...commonAxisOpts() },
        y: { ...commonAxisOpts(), ticks: { ...commonAxisOpts().ticks, callback: v => v + '%' } },
      },
      animation: { duration: 600 },
    },
  });
}

// ============================================================
// SECTION 14: FORECAST VS ACTUAL
// ============================================================

let chartForecast = null;

function renderForecastChart(filtered) {
  const won = filtered.filter(d => d.status === 'Closed Won');
  const { start } = getPeriodBounds(state.period);
  const months = [];
  const actuals = [];
  const forecasts = [];

  for (let i = 0; i < 12; i++) {
    const mDate = new Date(start.getFullYear(), start.getMonth() + i, 1);
    if (mDate > new Date(2026, 5, 30)) break;
    months.push(mDate.toLocaleString('en-US', { month: 'short' }));
    const actual = won
      .filter(d => d.date.getMonth() === mDate.getMonth() && d.date.getFullYear() === mDate.getFullYear())
      .reduce((s, d) => s + d.revenue, 0);
    actuals.push(parseFloat(actual.toFixed(0)));
    forecasts.push(parseFloat((actual * rand(0.88, 1.22)).toFixed(0)));
  }

  const ctx = document.getElementById('chartForecast').getContext('2d');

  if (chartForecast) {
    chartForecast.data.labels = months;
    chartForecast.data.datasets[0].data = actuals;
    chartForecast.data.datasets[1].data = forecasts;
    chartForecast.update('active');
    return;
  }

  chartForecast = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Actual',
          data: actuals,
          backgroundColor: '#2563eb',
          borderRadius: 5,
          borderSkipped: false,
          order: 1,
        },
        {
          label: 'Forecast',
          data: forecasts,
          type: 'line',
          borderColor: '#f59e0b',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 4],
          pointRadius: 4,
          pointBackgroundColor: '#f59e0b',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0.4,
          order: 0,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', align: 'end', labels: { color: getThemeColors().tick, boxWidth: 10, font: { size: 11 } } },
        tooltip: { ...commonTooltipOpts(), callbacks: { label: c => `${c.dataset.label}: $${fmtCompact(c.raw)}` } },
      },
      scales: {
        x: { ...commonAxisOpts() },
        y: { ...commonAxisOpts(), ticks: { ...commonAxisOpts().ticks, callback: v => '$' + fmtCompact(v) } },
      },
      animation: { duration: 600 },
    },
  });
}

// ============================================================
// SECTION 15: CUSTOMER ACQUISITION TREND
// ============================================================

let chartAcquisition = null;

function renderAcquisitionChart(filtered) {
  const { start } = getPeriodBounds(state.period);
  const months = [];
  const newCust = [];
  const retained = [];

  for (let i = 0; i < 12; i++) {
    const mDate = new Date(start.getFullYear(), start.getMonth() + i, 1);
    if (mDate > new Date(2026, 5, 30)) break;
    months.push(mDate.toLocaleString('en-US', { month: 'short' }));
    const inMonth = filtered.filter(d => d.date.getMonth() === mDate.getMonth() && d.date.getFullYear() === mDate.getFullYear() && d.status === 'Closed Won');
    const custSet = new Set(inMonth.map(d => d.customer));
    newCust.push(Math.floor(custSet.size * rand(0.5, 0.75)));
    retained.push(Math.floor(custSet.size * rand(0.25, 0.5)));
  }

  const ctx = document.getElementById('chartAcquisition').getContext('2d');

  if (chartAcquisition) {
    chartAcquisition.data.labels = months;
    chartAcquisition.data.datasets[0].data = newCust;
    chartAcquisition.data.datasets[1].data = retained;
    chartAcquisition.update('active');
    return;
  }

  chartAcquisition = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label: 'New Customers',
          data: newCust,
          borderColor: '#06b6d4',
          backgroundColor: createGradient(ctx, '#06b6d4', 0.18, 0.01),
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#06b6d4',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        },
        {
          label: 'Retained',
          data: retained,
          borderColor: '#8b5cf6',
          backgroundColor: createGradient(ctx, '#8b5cf6', 0.12, 0.01),
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#8b5cf6',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', align: 'end', labels: { color: getThemeColors().tick, boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
        tooltip: { ...commonTooltipOpts(), callbacks: { label: c => `${c.dataset.label}: ${c.raw}` } },
      },
      scales: {
        x: { ...commonAxisOpts() },
        y: { ...commonAxisOpts(), ticks: { ...commonAxisOpts().ticks } },
      },
      interaction: { mode: 'index', intersect: false },
      animation: { duration: 600 },
    },
  });
}

// ============================================================
// SECTION 16: SEGMENT DONUT CHART
// ============================================================

let chartSegment = null;

function renderSegmentChart(filtered) {
  const won = filtered.filter(d => d.status === 'Closed Won');
  const segRev = {};
  SEGMENTS.forEach(s => { segRev[s] = 0; });
  won.forEach(d => { segRev[d.segment] = (segRev[d.segment] || 0) + d.revenue; });

  const labels = SEGMENTS;
  const values = SEGMENTS.map(s => segRev[s]);
  const colors = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b'];
  const total = values.reduce((a, b) => a + b, 0);

  // Legend
  const legendEl = document.getElementById('segmentLegend');
  legendEl.innerHTML = labels.map((l, i) => `
    <div class="donut-legend-item">
      <div class="legend-dot" style="background:${colors[i]};"></div>
      <span class="legend-label">${l}</span>
      <span class="legend-value">$${fmtCompact(values[i])}</span>
      <span class="legend-pct">${total ? ((values[i]/total)*100).toFixed(1) : 0}%</span>
    </div>
  `).join('');

  const ctx = document.getElementById('chartSegment').getContext('2d');

  if (chartSegment) {
    chartSegment.data.datasets[0].data = values;
    chartSegment.update('active');
    return;
  }

  chartSegment = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        hoverBackgroundColor: colors.map(c => c + 'cc'),
        borderWidth: 2,
        borderColor: 'var(--bg-card)',
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: { ...commonTooltipOpts(), callbacks: { label: c => `${c.label}: $${fmtCompact(c.raw)} (${total ? ((c.raw/total)*100).toFixed(1) : 0}%)` } },
      },
      animation: { duration: 700 },
      onClick(evt) {
        const pts = chartSegment.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
        if (!pts.length) return;
        const seg = labels[pts[0].index];
        applyFilter('segment', seg);
      },
    },
  });
}

// ============================================================
// SECTION 17: DAILY HEATMAP
// ============================================================

function renderHeatmap(filtered) {
  const won = filtered.filter(d => d.status === 'Closed Won');
  // Build 52-week heatmap
  const container = document.getElementById('heatmapWrap');
  container.innerHTML = '';

  // Count revenue by date string
  const revByDay = {};
  won.forEach(d => {
    revByDay[d.dateStr] = (revByDay[d.dateStr] || 0) + d.revenue;
  });

  const allVals = Object.values(revByDay);
  const maxVal = allVals.length ? Math.max(...allVals) : 1;

  // Build 52 weeks back from today
  const today = new Date(2026, 5, 30);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (52 * 7));
  // Align to Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // Build weeks
  const weeks = [];
  let current = new Date(startDate);
  while (current <= today) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const ds = current.toISOString().slice(0, 10);
      const val = revByDay[ds] || 0;
      const level = val === 0 ? 0 : val < maxVal * 0.2 ? 1 : val < maxVal * 0.4 ? 2 : val < maxVal * 0.6 ? 3 : val < maxVal * 0.8 ? 4 : 5;
      week.push({ date: ds, val, level });
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }

  // Build month labels
  const monthLabels = document.createElement('div');
  monthLabels.className = 'heatmap-months';
  let lastMonth = -1;
  weeks.forEach(week => {
    const m = new Date(week[0].date).getMonth();
    if (m !== lastMonth) {
      const span = document.createElement('span');
      span.className = 'heatmap-month-label';
      span.style.minWidth = '28px';
      span.textContent = new Date(week[0].date).toLocaleString('en-US', { month: 'short' });
      monthLabels.appendChild(span);
      lastMonth = m;
    } else {
      const span = document.createElement('span');
      span.style.minWidth = '16px'; span.style.display = 'inline-block';
      monthLabels.appendChild(span);
    }
  });
  container.appendChild(monthLabels);

  const gridWrap = document.createElement('div');
  gridWrap.className = 'heatmap-grid-wrap';

  // Day labels
  const dayLabels = document.createElement('div');
  dayLabels.className = 'heatmap-days-labels';
  ['S','M','T','W','T','F','S'].forEach((d, i) => {
    const lbl = document.createElement('div');
    lbl.className = 'heatmap-day-label';
    lbl.textContent = i % 2 === 0 ? d : '';
    dayLabels.appendChild(lbl);
  });
  gridWrap.appendChild(dayLabels);

  const grid = document.createElement('div');
  grid.className = 'heatmap-grid';

  weeks.forEach(week => {
    const col = document.createElement('div');
    col.className = 'heatmap-week';
    week.forEach(day => {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      cell.setAttribute('data-level', day.level);
      if (day.val > 0) {
        cell.title = `${day.date}: $${day.val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
      }
      col.appendChild(cell);
    });
    grid.appendChild(col);
  });

  gridWrap.appendChild(grid);
  container.appendChild(gridWrap);

  // Legend
  const legend = document.createElement('div');
  legend.className = 'heatmap-legend';
  legend.innerHTML = `
    <span>Less</span>
    <div class="heatmap-legend-cells">
      ${[0,1,2,3,4,5].map(l => `<div class="heatmap-legend-cell heatmap-cell" data-level="${l}"></div>`).join('')}
    </div>
    <span>More</span>
  `;
  container.appendChild(legend);
}

// ============================================================
// SECTION 18: SPARKLINES
// ============================================================

const sparklineCharts = {};

function renderSparkline(id, data, color) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (sparklineCharts[id]) {
    sparklineCharts[id].data.datasets[0].data = data;
    sparklineCharts[id].update('none');
    return;
  }

  sparklineCharts[id] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((_, i) => i),
      datasets: [{
        data,
        borderColor: color,
        borderWidth: 2,
        fill: true,
        backgroundColor: color + '22',
        tension: 0.4,
        pointRadius: 0,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } },
      animation: { duration: 400 },
    },
  });
}

function buildSparklineData(filtered, field, months = 8) {
  const won = filtered.filter(d => d.status === 'Closed Won');
  const { start } = getPeriodBounds(state.period);
  const vals = [];
  for (let i = 0; i < months; i++) {
    const mDate = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const inM = won.filter(d => d.date.getMonth() === mDate.getMonth() && d.date.getFullYear() === mDate.getFullYear());
    if (field === 'revenue') vals.push(inM.reduce((s, d) => s + d.revenue, 0));
    else if (field === 'volume') vals.push(inM.length);
    else if (field === 'profit') vals.push(inM.reduce((s, d) => s + d.profit, 0));
    else if (field === 'aov') {
      const r = inM.reduce((s, d) => s + d.revenue, 0);
      vals.push(inM.length ? r / inM.length : 0);
    } else if (field === 'conv') {
      const tot = filtered.filter(d => d.date.getMonth() === mDate.getMonth() && d.date.getFullYear() === mDate.getFullYear()).length;
      vals.push(tot ? (inM.length / tot) * 100 : 0);
    }
  }
  return vals;
}

// ============================================================
// SECTION 19: KPI CARD UPDATES
// ============================================================

function fmtMoney(n) {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
}

function fmtCompact(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

function setKpiChange(elId, pct, isGood = true) {
  const el = document.getElementById(elId);
  if (!el) return;
  const positive = pct >= 0;
  const effectivelyGood = isGood ? positive : !positive;
  el.className = 'kpi-change ' + (effectivelyGood ? 'up' : 'down');
  el.innerHTML = `${positive ? '↑' : '↓'} ${Math.abs(pct).toFixed(1)}% vs prev period`;
}

function updateKPICards(filtered, prevFiltered) {
  const m  = calcMetrics(filtered);
  const mp = calcMetrics(prevFiltered);
  const growth = calcGrowth(filtered);

  // Revenue
  const revEl = document.getElementById('kv-revenue');
  if (revEl) {
    revEl.textContent = fmtMoney(m.totalRevenue);
    revEl.setAttribute('data-val', m.totalRevenue);
  }
  const revChg = mp.totalRevenue ? ((m.totalRevenue - mp.totalRevenue) / mp.totalRevenue) * 100 : 0;
  setKpiChange('kc-revenue', revChg);

  // Sales
  const salesEl = document.getElementById('kv-sales');
  if (salesEl) salesEl.textContent = m.totalSales.toLocaleString();
  const salesChg = mp.totalSales ? ((m.totalSales - mp.totalSales) / mp.totalSales) * 100 : 0;
  setKpiChange('kc-sales', salesChg);

  // Profit
  const profEl = document.getElementById('kv-profit');
  if (profEl) profEl.textContent = fmtMoney(m.totalProfit);
  const profChg = mp.totalProfit ? ((m.totalProfit - mp.totalProfit) / mp.totalProfit) * 100 : 0;
  setKpiChange('kc-profit', profChg);

  // Conversion
  const convEl = document.getElementById('kv-conv');
  if (convEl) convEl.textContent = m.convRate.toFixed(1) + '%';
  const convChg = mp.convRate ? ((m.convRate - mp.convRate) / mp.convRate) * 100 : 0;
  setKpiChange('kc-conv', convChg);

  // AOV
  const aovEl = document.getElementById('kv-aov');
  if (aovEl) aovEl.textContent = fmtMoney(m.aov);
  const aovChg = mp.aov ? ((m.aov - mp.aov) / mp.aov) * 100 : 0;
  setKpiChange('kc-aov', aovChg);

  // Growth
  const growEl = document.getElementById('kv-growth');
  if (growEl) growEl.textContent = (growth >= 0 ? '+' : '') + growth.toFixed(1) + '%';
  const growthEl = document.getElementById('kc-growth');
  if (growthEl) {
    growthEl.className = 'kpi-change ' + (growth >= 0 ? 'up' : 'down');
    growthEl.innerHTML = `${growth >= 0 ? '↑' : '↓'} YoY Revenue`;
  }

  // Mini stats
  const pipeEl = document.getElementById('ms-pipeline');
  if (pipeEl) pipeEl.textContent = '$' + fmtCompact(m.pipelineVal);
  const pipeSub = document.getElementById('ms-pipeline-sub');
  if (pipeSub) pipeSub.textContent = `${m.pipelineCount} open opportunities`;

  const oppsEl = document.getElementById('ms-opps');
  if (oppsEl) oppsEl.textContent = m.pipelineCount.toLocaleString();

  const lostEl = document.getElementById('ms-lost');
  if (lostEl) lostEl.textContent = m.lostCount.toLocaleString();
  const lostSub = document.getElementById('ms-lost-sub');
  if (lostSub) lostSub.textContent = `avg deal $${fmtCompact(m.lostAvgDeal)}`;

  const repEl = document.getElementById('ms-repeat');
  if (repEl) repEl.textContent = m.repeatPct.toFixed(0) + '%';
  const repSub = document.getElementById('ms-repeat-sub');
  if (repSub) repSub.textContent = 'of total customers';

  // Sparklines
  renderSparkline('spark-revenue', buildSparklineData(filtered, 'revenue'), '#2563eb');
  renderSparkline('spark-sales',   buildSparklineData(filtered, 'volume'), '#8b5cf6');
  renderSparkline('spark-profit',  buildSparklineData(filtered, 'profit'), '#10b981');
  renderSparkline('spark-conv',    buildSparklineData(filtered, 'conv'),   '#f59e0b');
  renderSparkline('spark-aov',     buildSparklineData(filtered, 'aov'),    '#06b6d4');
  renderSparkline('spark-growth',  buildSparklineData(filtered, 'revenue'), '#ef4444');
}

// ============================================================
// SECTION 20: LEADERBOARD
// ============================================================

function renderLeaderboard(filtered) {
  const won = filtered.filter(d => d.status === 'Closed Won');
  const spData = {};
  SALESPEOPLE.forEach(sp => {
    spData[sp.name] = { revenue: 0, deals: 0, total: 0, color: sp.avatar };
  });

  filtered.forEach(d => {
    if (!spData[d.salesperson]) spData[d.salesperson] = { revenue: 0, deals: 0, total: 0, color: d.salespersonColor };
    spData[d.salesperson].total++;
    if (d.status === 'Closed Won') {
      spData[d.salesperson].revenue += d.revenue;
      spData[d.salesperson].deals++;
    }
  });

  const sorted = Object.entries(spData)
    .map(([name, d]) => ({ name, ...d, winRate: d.total ? (d.deals / d.total) * 100 : 0 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const container = document.getElementById('leaderboardList');
  container.innerHTML = sorted.map((sp, i) => {
    const initials = sp.name.split(' ').map(n => n[0]).join('').slice(0, 2);
    const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other';
    return `
      <div class="leader-row">
        <div class="leader-rank ${rankClass}">${i + 1}</div>
        <div class="leader-avatar" style="background:${sp.color};">${initials}</div>
        <div class="leader-info">
          <div class="leader-name">${sp.name}</div>
          <div class="leader-deals">${sp.deals} deals closed</div>
        </div>
        <div class="leader-stats">
          <div class="leader-revenue">$${fmtCompact(sp.revenue)}</div>
          <div class="leader-winrate">${sp.winRate.toFixed(0)}% win rate</div>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// SECTION 21: RECENT SALES TABLE
// ============================================================

let TABLE_PAGE_SIZE = 10;

function renderTable(filtered) {
  let data = [...filtered];

  // Search
  if (state.tableSearch) {
    const q = state.tableSearch.toLowerCase();
    data = data.filter(d =>
      d.orderId.toLowerCase().includes(q) ||
      d.customer.toLowerCase().includes(q) ||
      d.product.toLowerCase().includes(q) ||
      d.salesperson.toLowerCase().includes(q) ||
      d.region.toLowerCase().includes(q)
    );
  }

  // Sort
  data.sort((a, b) => {
    const { key, dir } = state.tableSort;
    let aVal = a[key]; let bVal = b[key];
    if (key === 'date') { aVal = a.date; bVal = b.date; }
    if (key === 'revenue') { aVal = a.revenue; bVal = b.revenue; }
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return dir === 'asc' ? -1 : 1;
    if (aVal > bVal) return dir === 'asc' ? 1 : -1;
    return 0;
  });

  const total = data.length;
  const pages = Math.max(1, Math.ceil(total / TABLE_PAGE_SIZE));
  state.tablePage = Math.min(state.tablePage, pages);
  const start = (state.tablePage - 1) * TABLE_PAGE_SIZE;
  const page = data.slice(start, start + TABLE_PAGE_SIZE);

  document.getElementById('tableCount').textContent = `Showing ${total ? start + 1 : 0}–${Math.min(start + TABLE_PAGE_SIZE, total)} of ${total.toLocaleString()} records`;

  const tbody = document.getElementById('salesTableBody');
  tbody.innerHTML = page.map(d => {
    const statusClass = d.status === 'Closed Won' ? 'status-won' : d.status === 'Lost' ? 'status-lost' : 'status-pipeline';
    const statusLabel = d.status === 'Pipeline' ? 'In Pipeline' : d.status;
    return `
      <tr>
        <td class="td-primary">${d.orderId}</td>
        <td>${d.customer}</td>
        <td>${d.product}</td>
        <td>${d.salesperson.split(' ')[0]} ${d.salesperson.split(' ').slice(-1)[0]}</td>
        <td>${d.region}</td>
        <td class="td-revenue">$${d.revenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
        <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
        <td>${d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</td>
      </tr>
    `;
  }).join('');

  if (page.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted);">No records match your filters.</td></tr>`;
  }

  // Pagination
  const info = document.getElementById('paginationInfo');
  info.textContent = `Page ${state.tablePage} of ${pages}`;

  const btnContainer = document.getElementById('paginationBtns');
  btnContainer.innerHTML = '';

  const addBtn = (label, page, isActive = false) => {
    const btn = document.createElement('button');
    btn.className = 'pag-btn' + (isActive ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => { state.tablePage = page; renderTable(filtered); });
    btnContainer.appendChild(btn);
  };

  if (state.tablePage > 1) addBtn('←', state.tablePage - 1);
  const startPage = Math.max(1, state.tablePage - 2);
  const endPage = Math.min(pages, startPage + 4);
  for (let p = startPage; p <= endPage; p++) addBtn(p, p, p === state.tablePage);
  if (state.tablePage < pages) addBtn('→', state.tablePage + 1);
}

// ============================================================
// SECTION 22: FILTER CHIPS
// ============================================================

function updateFilterChips() {
  const row = document.getElementById('filterChipsRow');
  const chips = [];

  const filterMeta = [
    { key: 'region', label: 'Region' },
    { key: 'category', label: 'Category' },
    { key: 'salesperson', label: 'Salesperson' },
    { key: 'segment', label: 'Segment' },
    { key: 'channel', label: 'Channel' },
  ];

  filterMeta.forEach(f => {
    if (state[f.key] !== 'all') {
      chips.push(`
        <div class="filter-chip">
          <span>${f.label}: ${state[f.key]}</span>
          <span class="chip-remove" data-filter="${f.key}">×</span>
        </div>
      `);
    }
  });

  row.style.display = chips.length ? 'flex' : 'none';
  row.innerHTML = chips.length ? chips.join('') + `<button class="btn btn-outline" id="clearAllFilters" style="padding:3px 10px;font-size:11px;">Clear All</button>` : '';

  // Remove chip listeners
  row.querySelectorAll('.chip-remove').forEach(el => {
    el.addEventListener('click', () => { applyFilter(el.dataset.filter, 'all'); });
  });

  const clearBtn = document.getElementById('clearAllFilters');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearAllFilters);
  }

  // Update select visuals
  ['region', 'category', 'salesperson', 'segment', 'channel'].forEach(key => {
    const el = document.getElementById('filter' + key.charAt(0).toUpperCase() + key.slice(1));
    if (el) {
      el.classList.toggle('has-filter', state[key] !== 'all');
    }
  });
}

function applyFilter(key, value) {
  const current = state[key];
  state[key] = (current === value && value !== 'all') ? 'all' : value;

  // Update select element
  const selectId = 'filter' + key.charAt(0).toUpperCase() + key.slice(1);
  const sel = document.getElementById(selectId);
  if (sel) sel.value = state[key];

  state.tablePage = 1;
  refreshDashboard();
}

function clearAllFilters() {
  state.region = 'all';
  state.category = 'all';
  state.salesperson = 'all';
  state.segment = 'all';
  state.channel = 'all';
  state.tablePage = 1;

  document.getElementById('filterRegion').value = 'all';
  document.getElementById('filterCategory').value = 'all';
  document.getElementById('filterSalesperson').value = 'all';
  document.getElementById('filterSegment').value = 'all';
  document.getElementById('filterChannel').value = 'all';

  refreshDashboard();
  showToast('All filters cleared', '🔄');
}

// ============================================================
// SECTION 23: MAIN REFRESH
// ============================================================

function refreshDashboard() {
  const filtered = filterData(RAW_DATA);
  const prevFiltered = filterPrevPeriod();

  updateKPICards(filtered, prevFiltered);
  renderMonthlyTrend(filtered);
  renderCategoryChart(filtered);
  renderRegionChart(filtered);
  renderTopProducts(filtered);
  renderFunnel(filtered);
  renderSalespersonConv(filtered);
  renderBulletChart(filtered);
  renderProfitMarginChart(filtered);
  renderForecastChart(filtered);
  renderAcquisitionChart(filtered);
  renderSegmentChart(filtered);
  renderHeatmap(filtered);
  renderLeaderboard(filtered);
  renderTable(filtered);
  updateFilterChips();
  updateThemeOnCharts();
}

// ============================================================
// SECTION 24: THEME MANAGEMENT
// ============================================================

function updateThemeOnCharts() {
  const t = getThemeColors();
  const charts = [chartMonthlyTrend, chartCategory, chartRegion, chartTopProducts, chartSalespersonConv, chartProfitMargin, chartForecast, chartAcquisition, chartSegment];

  charts.forEach(chart => {
    if (!chart) return;
    if (chart.options.scales) {
      Object.values(chart.options.scales).forEach(scale => {
        if (scale.grid) scale.grid.color = t.grid;
        if (scale.ticks) scale.ticks.color = t.tick;
      });
    }
    if (chart.options.plugins?.legend?.labels) {
      chart.options.plugins.legend.labels.color = t.tick;
    }
    chart.update('none');
  });
}

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  state.darkMode = !isDark;

  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.setAttribute('data-lucide', isDark ? 'moon' : 'sun');
    lucide.createIcons();
  }

  updateThemeOnCharts();
  showToast(isDark ? 'Light mode activated' : 'Dark mode activated', isDark ? '☀️' : '🌙');
}

// ============================================================
// SECTION 25: TOAST NOTIFICATIONS
// ============================================================

function showToast(message, icon = 'ℹ️') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; toast.style.transition = 'all 0.3s ease'; setTimeout(() => toast.remove(), 300); }, 2500);
}

// ============================================================
// SECTION 26: EXPORT FUNCTIONS
// ============================================================

function exportCSV() {
  const filtered = filterData(RAW_DATA).filter(d => d.status === 'Closed Won');
  const headers = ['Order ID', 'Date', 'Customer', 'Product', 'Category', 'Salesperson', 'Region', 'Segment', 'Channel', 'Revenue', 'Cost', 'Profit', 'Status'];
  const rows = filtered.map(d => [
    d.orderId, d.dateStr, d.customer, d.product, d.category,
    d.salesperson, d.region, d.segment, d.channel,
    d.revenue.toFixed(2), d.cost.toFixed(2), d.profit.toFixed(2), d.status,
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `sales_data_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
  showToast(`Exported ${filtered.length} records to CSV`, '📊');
}

function exportPDF() {
  showToast('Preparing PDF export…', '📄');
  setTimeout(() => window.print(), 300);
}

// ============================================================
// SECTION 27: EVENT LISTENERS
// ============================================================

function initEventListeners() {
  // Sidebar toggle
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');
  const overlay = document.getElementById('sidebarOverlay');

  sidebarToggle.addEventListener('click', () => {
    const isMobile = window.innerWidth < 992;
    if (isMobile) {
      sidebar.classList.toggle('mobile-open');
      overlay.classList.toggle('visible');
    } else {
      sidebar.classList.toggle('collapsed');
      mainContent.classList.toggle('expanded');
    }
  });

  overlay.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('visible');
  });

  // Theme toggle
  document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);

  // Filters
  document.getElementById('filterPeriod').addEventListener('change', e => {
    state.period = e.target.value;
    state.tablePage = 1;
    refreshDashboard();
  });

  ['filterRegion', 'filterCategory', 'filterSalesperson', 'filterSegment', 'filterChannel'].forEach(id => {
    document.getElementById(id).addEventListener('change', e => {
      const key = id.replace('filter', '').toLowerCase();
      state[key] = e.target.value;
      state.tablePage = 1;
      refreshDashboard();
    });
  });

  // Table search
  let searchTimeout;
  document.getElementById('tableSearch').addEventListener('input', e => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.tableSearch = e.target.value;
      state.tablePage = 1;
      renderTable(filterData(RAW_DATA));
    }, 300);
  });

  // Table sort
  document.querySelectorAll('thead th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (state.tableSort.key === key) {
        state.tableSort.dir = state.tableSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        state.tableSort = { key, dir: 'desc' };
      }
      state.tablePage = 1;
      renderTable(filterData(RAW_DATA));
    });
  });

  // Monthly trend tabs
  document.querySelectorAll('[data-chart="monthlyTrend"]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-chart="monthlyTrend"]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.monthlyTrendType = btn.dataset.type;
      renderMonthlyTrend(filterData(RAW_DATA));
    });
  });

  // Category chart tabs
  document.querySelectorAll('[data-chart="categoryChart"]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-chart="categoryChart"]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.categoryChartType = btn.dataset.type;
      renderCategoryChart(filterData(RAW_DATA));
    });
  });

  // Export buttons
  document.getElementById('btnExportExcel').addEventListener('click', exportCSV);
  document.getElementById('btnExportPDF').addEventListener('click', exportPDF);

  // Nav items — full navigation logic
  const navSectionMap = {
    'nav-dashboard':  { section: 'section-dashboard',  label: 'Dashboard Overview',       filter: null },
    'nav-analytics':  { section: 'section-analytics',  label: 'Analytics & Trends',       filter: null },
    'nav-pipeline':   { section: 'section-pipeline',   label: 'Pipeline Stats',           filter: null },
    'nav-revenue':    { section: 'section-revenue',    label: 'Revenue vs Target',        filter: null },
    'nav-customers':  { section: 'section-customers',  label: 'Customer Acquisition',     filter: null },
    'nav-products':   { section: 'section-products',   label: 'Products & Transactions',  filter: null },
    'nav-targets':    { section: 'section-targets',    label: 'Targets & Segments',       filter: null },
    'nav-team':       { section: 'section-team',       label: 'Sales Team Performance',   filter: null },
    'nav-regions':    { section: 'section-regions',    label: 'Regional Breakdown',       filter: null },
    'nav-reports':    { section: null,                  label: 'Reports',                  modal: 'reports' },
    'nav-settings':   { section: null,                  label: 'Settings',                 modal: 'settings' },
  };

  document.querySelectorAll('.nav-item[id]').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.id;
      const meta = navSectionMap[id];
      if (!meta) return;

      // Update active state
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      if (meta.modal === 'settings') {
        openSettingsModal();
        return;
      }
      if (meta.modal === 'reports') {
        openReportsModal();
        return;
      }

      if (meta.section) {
        const el = document.getElementById(meta.section);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Highlight effect
          setTimeout(() => {
            el.classList.add('section-highlight');
            setTimeout(() => el.classList.remove('section-highlight'), 1300);
          }, 400);
          showToast(`Navigated to ${meta.label}`, '📍');
        }
      }
    });
  });

  // Window resize
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 992) {
      overlay.classList.remove('visible');
      sidebar.classList.remove('mobile-open');
    }
  });
}

// ============================================================
// SECTION 29: SETTINGS MODAL
// ============================================================

let settingsState = {
  currency: 'USD',
  rowsPerPage: 10,
  compact: false,
  refreshInterval: 120,
  exportFormat: 'csv',
};

function openSettingsModal() {
  const backdrop = document.getElementById('settingsModalBackdrop');
  // Sync current state into controls
  document.getElementById('settingsDarkModeCheck').checked = state.darkMode;
  document.getElementById('settingsRowsPerPage').value = settingsState.rowsPerPage;
  document.getElementById('settingsCompactMode').checked = settingsState.compact;
  document.getElementById('settingsCurrency').value = settingsState.currency;
  document.getElementById('settingsRefreshInterval').value = settingsState.refreshInterval;
  document.getElementById('settingsExportFormat').value = settingsState.exportFormat;
  backdrop.classList.add('open');
  lucide.createIcons();
}

function closeSettingsModal() {
  document.getElementById('settingsModalBackdrop').classList.remove('open');
}

function applySettings() {
  // Dark mode
  const darkCheck = document.getElementById('settingsDarkModeCheck').checked;
  if (darkCheck !== state.darkMode) {
    toggleTheme();
  }

  // Rows per page
  const rows = parseInt(document.getElementById('settingsRowsPerPage').value);
  if (rows !== settingsState.rowsPerPage) {
    settingsState.rowsPerPage = rows;
    TABLE_PAGE_SIZE = rows;
    state.tablePage = 1;
  }

  // Compact mode
  const compact = document.getElementById('settingsCompactMode').checked;
  settingsState.compact = compact;
  const tableWrap = document.querySelector('.table-wrap');
  if (tableWrap) tableWrap.closest('.card').classList.toggle('table-compact', compact);

  // Currency (stored for future use)
  settingsState.currency = document.getElementById('settingsCurrency').value;

  // Refresh interval
  settingsState.refreshInterval = parseInt(document.getElementById('settingsRefreshInterval').value);

  // Export format
  settingsState.exportFormat = document.getElementById('settingsExportFormat').value;

  closeSettingsModal();
  refreshDashboard();
  showToast('Settings saved successfully', '✅');
}

function resetSettings() {
  settingsState = { currency: 'USD', rowsPerPage: 10, compact: false, refreshInterval: 120, exportFormat: 'csv' };
  document.getElementById('settingsDarkModeCheck').checked = false;
  document.getElementById('settingsRowsPerPage').value = 10;
  document.getElementById('settingsCompactMode').checked = false;
  document.getElementById('settingsCurrency').value = 'USD';
  document.getElementById('settingsRefreshInterval').value = 120;
  document.getElementById('settingsExportFormat').value = 'csv';

  // Revert dark mode if needed
  if (state.darkMode) toggleTheme();

  showToast('Settings reset to defaults', '🔄');
}

// ============================================================
// SECTION 30: REPORTS MODAL
// ============================================================

function openReportsModal() {
  const backdrop = document.getElementById('reportsModalBackdrop');
  backdrop.classList.add('open');
  buildReportsContent();
  lucide.createIcons();
}

function closeReportsModal() {
  document.getElementById('reportsModalBackdrop').classList.remove('open');
}

function buildReportsContent() {
  const filtered = filterData(RAW_DATA);
  const m = calcMetrics(filtered);
  const growth = calcGrowth(filtered);

  // Salesperson breakdown
  const spData = {};
  SALESPEOPLE.forEach(sp => { spData[sp.name] = { revenue: 0, deals: 0, total: 0, color: sp.avatar }; });
  filtered.forEach(d => {
    if (!spData[d.salesperson]) spData[d.salesperson] = { revenue: 0, deals: 0, total: 0, color: d.salespersonColor };
    spData[d.salesperson].total++;
    if (d.status === 'Closed Won') {
      spData[d.salesperson].revenue += d.revenue;
      spData[d.salesperson].deals++;
    }
  });

  const spSorted = Object.entries(spData)
    .map(([name, d]) => ({ name, ...d, winRate: d.total ? (d.deals / d.total) * 100 : 0 }))
    .sort((a, b) => b.revenue - a.revenue);

  // Category breakdown
  const catData = {};
  CATEGORIES.forEach(c => { catData[c] = { revenue: 0, deals: 0 }; });
  filtered.filter(d => d.status === 'Closed Won').forEach(d => {
    catData[d.category].revenue += d.revenue;
    catData[d.category].deals++;
  });

  const periodLabel = document.getElementById('filterPeriod').options[document.getElementById('filterPeriod').selectedIndex].text;

  document.getElementById('reportsModalBody').innerHTML = `
    <div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Period: <strong>${periodLabel}</strong> &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
      <div class="report-kpi-grid">
        <div class="report-kpi-card">
          <div class="report-kpi-label">Total Revenue</div>
          <div class="report-kpi-value" style="color:var(--primary);">${fmtMoney(m.totalRevenue)}</div>
        </div>
        <div class="report-kpi-card">
          <div class="report-kpi-label">Gross Profit</div>
          <div class="report-kpi-value" style="color:var(--success);">${fmtMoney(m.totalProfit)}</div>
        </div>
        <div class="report-kpi-card">
          <div class="report-kpi-label">Total Deals</div>
          <div class="report-kpi-value">${m.totalSales.toLocaleString()}</div>
        </div>
        <div class="report-kpi-card">
          <div class="report-kpi-label">Win Rate</div>
          <div class="report-kpi-value">${m.convRate.toFixed(1)}%</div>
        </div>
        <div class="report-kpi-card">
          <div class="report-kpi-label">Avg Deal Size</div>
          <div class="report-kpi-value">${fmtMoney(m.aov)}</div>
        </div>
        <div class="report-kpi-card">
          <div class="report-kpi-label">YoY Growth</div>
          <div class="report-kpi-value" style="color:${growth >= 0 ? 'var(--success)' : 'var(--danger)'};">${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%</div>
        </div>
      </div>
    </div>

    <div>
      <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:8px;">Salesperson Performance</div>
      <div class="report-table-wrap">
        <table class="report-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Revenue</th>
              <th>Deals</th>
              <th>Win Rate</th>
              <th>Avg Deal</th>
            </tr>
          </thead>
          <tbody>
            ${spSorted.map((sp, i) => `
              <tr>
                <td style="font-weight:700;color:${i < 3 ? 'var(--warning)' : 'var(--text-muted)'};">${i + 1}</td>
                <td style="font-weight:600;">${sp.name}</td>
                <td style="font-weight:700;color:var(--primary);">${fmtMoney(sp.revenue)}</td>
                <td>${sp.deals}</td>
                <td>${sp.winRate.toFixed(1)}%</td>
                <td>${sp.deals ? fmtMoney(sp.revenue / sp.deals) : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div>
      <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:8px;">Revenue by Category</div>
      <div class="report-table-wrap">
        <table class="report-table">
          <thead><tr><th>Category</th><th>Revenue</th><th>Deals</th><th>Avg Deal</th></tr></thead>
          <tbody>
            ${Object.entries(catData).sort((a,b) => b[1].revenue - a[1].revenue).map(([cat, d]) => `
              <tr>
                <td style="font-weight:600;">${cat}</td>
                <td style="color:var(--primary);font-weight:700;">${fmtMoney(d.revenue)}</td>
                <td>${d.deals}</td>
                <td>${d.deals ? fmtMoney(d.revenue / d.deals) : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ============================================================
// SECTION 31: MODAL EVENT LISTENERS
// ============================================================

function initModals() {
  // Settings modal
  document.getElementById('settingsModalClose').addEventListener('click', closeSettingsModal);
  document.getElementById('settingsSave').addEventListener('click', applySettings);
  document.getElementById('settingsReset').addEventListener('click', resetSettings);
  document.getElementById('settingsModalBackdrop').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeSettingsModal();
  });

  // Reports modal
  document.getElementById('reportsModalClose').addEventListener('click', closeReportsModal);
  document.getElementById('reportsModalBackdrop').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeReportsModal();
  });
  document.getElementById('reportsExportBtn').addEventListener('click', () => {
    exportCSV();
    closeReportsModal();
  });
  document.getElementById('reportsPrintBtn').addEventListener('click', () => {
    closeReportsModal();
    exportPDF();
  });

  // Dark mode toggle in settings syncs to current state
  document.getElementById('settingsDarkModeCheck').addEventListener('change', () => {
    // Preview only — applied on Save
  });

  // ESC key to close modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeSettingsModal();
      closeReportsModal();
    }
  });
}

// ============================================================
// SECTION 28: INITIALIZATION
// ============================================================

function init() {
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Set last updated time
  const now = new Date(2026, 5, 30, 23, 39, 8);
  document.getElementById('lastUpdated').textContent =
    'Last updated: ' + now.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Initialize event listeners
  initEventListeners();

  // Initialize modals
  initModals();

  // Initial dashboard render
  refreshDashboard();

  // Show welcome toast
  setTimeout(() => showToast('Dashboard loaded — 1,200 records', '✅'), 600);

  // Auto-refresh simulation every 2 minutes
  setInterval(() => {
    document.getElementById('lastUpdated').textContent =
      'Live — ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }, 120000);
}

// Boot
document.addEventListener('DOMContentLoaded', init);
