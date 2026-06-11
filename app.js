// Predefined products map matching backend db.js to dynamically assist transaction insertion
const PRODUCTS_MAP = {
  "Technology": [
    { name: "UltraBook Pro 15", price: 1299.99 },
    { name: "Curved Monitor 34", price: 449.99 },
    { name: "Wireless Mech Keyboard", price: 129.99 },
    { name: "Noise-Canceling Headphones", price: 199.99 },
    { name: "Enterprise Cloud Subscription", price: 2400.00 }
  ],
  "Office Supplies": [
    { name: "Ergonomic Desk Chair", price: 349.99 },
    { name: "Electric Standing Desk", price: 499.99 },
    { name: "Premium Leather Notebook", price: 24.99 },
    { name: "Metal Organizer Set", price: 39.99 },
    { name: "Dry Erase Glass Board", price: 149.99 }
  ],
  "Furniture": [
    { name: "Modern Sofa", price: 899.99 },
    { name: "Minimalist Bookshelf", price: 179.99 },
    { name: "Oak Dining Table", price: 599.99 },
    { name: "Adjustable Barstool", price: 89.99 },
    { name: "Accent Lounge Chair", price: 249.99 }
  ],
  "Apparel": [
    { name: "Branded Hoodie", price: 59.99 },
    { name: "Dry-Fit Polo Shirt", price: 34.99 },
    { name: "Waterproof Windbreaker", price: 89.99 },
    { name: "Activewear Joggers", price: 44.99 },
    { name: "Classic Canvas Sneaker", price: 69.99 }
  ]
};

// Global chart references
let trendChart = null;
let regionsChart = null;
let categoriesChart = null;

// Pagination state
let currentPage = 1;
const recordsLimit = 10;
let searchDebounceTimer;

// DOM Elements
const filterStartDate = document.getElementById('filter-startDate');
const filterEndDate = document.getElementById('filter-endDate');
const filterCategory = document.getElementById('filter-category');
const filterRegion = document.getElementById('filter-region');
const searchInput = document.getElementById('search-input');
const btnExport = document.getElementById('btn-export');
const btnAddTransaction = document.getElementById('btn-add-transaction');

// Modal Elements
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const btnFormCancel = document.getElementById('form-cancel');
const transactionForm = document.getElementById('transaction-form');
const formCategory = document.getElementById('form-category');
const formProduct = document.getElementById('form-productName');
const formPrice = document.getElementById('form-price');
const formQuantity = document.getElementById('form-quantity');

// Table & Pagination Elements
const transactionsBody = document.getElementById('transactions-body');
const paginationInfo = document.getElementById('pagination-info');
const paginationPrev = document.getElementById('pagination-prev');
const paginationNext = document.getElementById('pagination-next');

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
  // Setup Default Date Filter (YTD or Last 12 months)
  const defaultStart = new Date();
  defaultStart.setMonth(defaultStart.getMonth() - 6); // default view shows last 6 months
  filterStartDate.value = defaultStart.toISOString().split('T')[0];
  
  const defaultEnd = new Date();
  filterEndDate.value = defaultEnd.toISOString().split('T')[0];

  // Initialize Icons
  lucide.createIcons();

  // Load Data
  refreshDashboard();

  // Attach Filter Listeners
  filterStartDate.addEventListener('change', () => { currentPage = 1; refreshDashboard(); });
  filterEndDate.addEventListener('change', () => { currentPage = 1; refreshDashboard(); });
  filterCategory.addEventListener('change', () => { currentPage = 1; refreshDashboard(); });
  filterRegion.addEventListener('change', () => { currentPage = 1; refreshDashboard(); });
  
  // Table Search input with Debounce
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      currentPage = 1;
      fetchTableTransactions();
    }, 300);
  });

  // Export CSV
  btnExport.addEventListener('click', exportCSV);

  // Pagination Listeners
  paginationPrev.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      fetchTableTransactions();
    }
  });
  paginationNext.addEventListener('click', () => {
    currentPage++;
    fetchTableTransactions();
  });

  // Ingestion Modal Listeners
  btnAddTransaction.addEventListener('click', openModal);
  modalClose.addEventListener('click', closeModal);
  btnFormCancel.addEventListener('click', closeModal);
  transactionForm.addEventListener('submit', handleFormSubmit);

  // Form Category Change -> Dynamic products & price
  formCategory.addEventListener('change', populateFormProducts);
  formProduct.addEventListener('change', setFormPrice);
});

// Refresh Dashboard wrapper
function refreshDashboard() {
  fetchSummary();
  fetchTrend();
  fetchCategories();
  fetchRegions();
  fetchProducts();
  fetchReps();
  fetchTableTransactions();
}

// Format Query String Helper
function getQueryString() {
  const params = new URLSearchParams();
  if (filterStartDate.value) params.append('startDate', filterStartDate.value);
  if (filterEndDate.value) params.append('endDate', filterEndDate.value);
  if (filterCategory.value) params.append('category', filterCategory.value);
  if (filterRegion.value) params.append('region', filterRegion.value);
  return params.toString();
}

// Global Chart Settings Configuration
Chart.defaults.color = '#9ca3af';
Chart.defaults.font.family = "'Outfit', sans-serif";
Chart.defaults.font.size = 12;

// Toast Alerts
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? 'check-circle' : 'alert-circle';
  toast.innerHTML = `<i data-lucide="${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  lucide.createIcons({ attrs: { class: 'toast-icon' } });

  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 4000);
}

// 1. Fetch KPI Summary Metrics
async function fetchSummary() {
  try {
    const response = await fetch(`/api/dashboard/summary?${getQueryString()}`);
    const data = await response.json();

    // Render Metrics
    document.getElementById('kpi-revenue').innerText = new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD'
    }).format(data.totalRevenue);

    document.getElementById('kpi-orders').innerText = new Intl.NumberFormat('en-US').format(data.totalOrders);
    
    document.getElementById('kpi-aov').innerText = new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD'
    }).format(data.averageOrderValue);
    
    document.getElementById('kpi-conversion').innerText = `${data.conversionRate}%`;

    // Render Growth indicators
    updateGrowthBadge('kpi-revenue-growth', data.revenueGrowth);
    updateGrowthBadge('kpi-orders-growth', data.ordersGrowth);
    updateGrowthBadge('kpi-aov-growth', data.aovGrowth);
    updateGrowthBadge('kpi-conversion-growth', data.conversionRateGrowth, true); // absolute change
  } catch (err) {
    console.error("Error fetching summary KPIs:", err);
    showToast("Failed to fetch summary metrics", "error");
  }
}

function updateGrowthBadge(elementId, growth, isAbsolute = false) {
  const badge = document.getElementById(elementId);
  const sign = growth >= 0 ? '+' : '';
  const text = isAbsolute ? `${sign}${growth}% pts` : `${sign}${growth}%`;
  
  badge.className = 'kpi-growth';
  if (growth > 0) {
    badge.classList.add('positive');
    badge.innerHTML = `<i data-lucide="trending-up" style="width: 14px; height: 14px;"></i> ${text}`;
  } else if (growth < 0) {
    badge.classList.add('negative');
    badge.innerHTML = `<i data-lucide="trending-down" style="width: 14px; height: 14px;"></i> ${text}`;
  } else {
    badge.classList.add('neutral');
    badge.innerHTML = `<i data-lucide="minus" style="width: 14px; height: 14px;"></i> ${text}`;
  }
  lucide.createIcons();
}

// 2. Fetch Sales Trend Line Chart
async function fetchTrend() {
  try {
    const response = await fetch(`/api/dashboard/sales-trend?${getQueryString()}`);
    const data = await response.json();

    const labels = data.map(d => d.period);
    const revenue = data.map(d => d.revenue);
    const orders = data.map(d => d.orders);

    if (trendChart) {
      trendChart.destroy();
    }

    const ctx = document.getElementById('chart-trend').getContext('2d');
    trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Revenue ($)',
            data: revenue,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.05)',
            fill: true,
            tension: 0.4,
            yAxisID: 'y'
          },
          {
            label: 'Orders',
            data: orders,
            borderColor: '#0ea5e9',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            tension: 0.4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12 } }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.03)' }
          },
          y: {
            type: 'linear',
            position: 'left',
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            title: { display: true, text: 'Revenue ($)', color: '#9ca3af' }
          },
          y1: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'Orders Count', color: '#9ca3af' }
          }
        }
      }
    });
  } catch (err) {
    console.error("Error fetching sales trend:", err);
  }
}

// 3. Fetch Category Distribution Donut Chart
async function fetchCategories() {
  try {
    const response = await fetch(`/api/dashboard/categories?${getQueryString()}`);
    const data = await response.json();

    const labels = data.map(d => d.category);
    const percentages = data.map(d => d.percentage);

    if (categoriesChart) {
      categoriesChart.destroy();
    }

    const ctx = document.getElementById('chart-categories').getContext('2d');
    categoriesChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: percentages,
          backgroundColor: ['#6366f1', '#0ea5e9', '#f59e0b', '#ec4899'],
          borderWidth: 1,
          borderColor: 'rgba(17, 24, 39, 0.9)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15 } },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ` ${context.label}: ${context.raw}%`;
              }
            }
          }
        },
        cutout: '65%'
      }
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
  }
}

// 4. Fetch Regional Sales Pie Chart
async function fetchRegions() {
  try {
    const response = await fetch(`/api/dashboard/regions?${getQueryString()}`);
    const data = await response.json();

    const labels = data.map(d => d.region);
    const revenues = data.map(d => d.revenue);

    if (regionsChart) {
      regionsChart.destroy();
    }

    const ctx = document.getElementById('chart-regions').getContext('2d');
    regionsChart = new Chart(ctx, {
      type: 'polarArea',
      data: {
        labels: labels,
        datasets: [{
          data: revenues,
          backgroundColor: [
            'rgba(99, 102, 241, 0.65)',
            'rgba(14, 165, 233, 0.65)',
            'rgba(16, 185, 129, 0.65)',
            'rgba(245, 158, 11, 0.65)'
          ],
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            angleLines: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { display: false }
          }
        },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10 } }
        }
      }
    });
  } catch (err) {
    console.error("Error fetching regional data:", err);
  }
}

// 5. Fetch Top Products List
async function fetchProducts() {
  try {
    const response = await fetch(`/api/dashboard/products?${getQueryString()}&limit=4`);
    const data = await response.json();

    const listContainer = document.getElementById('list-products');
    listContainer.innerHTML = '';

    if (data.length === 0) {
      listContainer.innerHTML = '<div class="list-item">No sales found in this range</div>';
      return;
    }

    data.forEach(p => {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML = `
        <div class="list-item-info">
          <span class="list-item-title">${p.productName}</span>
          <span class="list-item-subtitle">${p.category}</span>
        </div>
        <div class="list-item-stats">
          <span class="list-item-value">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p.revenue)}</span>
          <div class="list-item-meta">${p.unitsSold} units</div>
        </div>
      `;
      listContainer.appendChild(item);
    });
  } catch (err) {
    console.error("Error fetching products list:", err);
  }
}

// 6. Fetch Sales Reps Performance
async function fetchReps() {
  try {
    const response = await fetch(`/api/dashboard/reps?${getQueryString()}`);
    const data = await response.json();

    const listContainer = document.getElementById('list-reps');
    listContainer.innerHTML = '';

    if (data.length === 0) {
      listContainer.innerHTML = '<div class="list-item">No active reps recorded</div>';
      return;
    }

    data.forEach((r, index) => {
      const rank = index + 1;
      const item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML = `
        <div class="list-item-info">
          <span class="list-item-title">#${rank} ${r.repName}</span>
          <span class="list-item-subtitle">${r.orders} transactions closed</span>
        </div>
        <div class="list-item-stats">
          <span class="list-item-value">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(r.revenue)}</span>
          <div class="list-item-meta">${r.dealsClosed} deals</div>
        </div>
      `;
      listContainer.appendChild(item);
    });
  } catch (err) {
    console.error("Error fetching reps leaderboard:", err);
  }
}

// 7. Fetch Table Transactions
async function fetchTableTransactions() {
  try {
    let url = `/api/sales?page=${currentPage}&limit=${recordsLimit}&${getQueryString()}`;
    if (searchInput.value) {
      url += `&search=${encodeURIComponent(searchInput.value)}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    // Render table body
    transactionsBody.innerHTML = '';

    if (data.transactions.length === 0) {
      transactionsBody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching transactions found</td>
        </tr>
      `;
      paginationInfo.innerText = `Showing page 0 of 0 (0 total records)`;
      paginationPrev.disabled = true;
      paginationNext.disabled = true;
      return;
    }

    data.transactions.forEach(tx => {
      const row = document.createElement('tr');
      
      // Determine badge class for categories
      let badgeClass = 'badge-tech';
      if (tx.category === 'Office Supplies') badgeClass = 'badge-supplies';
      else if (tx.category === 'Furniture') badgeClass = 'badge-furniture';
      else if (tx.category === 'Apparel') badgeClass = 'badge-apparel';

      row.innerHTML = `
        <td style="font-family: monospace; font-weight: 500;">${tx.id}</td>
        <td>${tx.date}</td>
        <td>${tx.customerName}</td>
        <td style="font-weight: 500;">${tx.productName}</td>
        <td><span class="badge ${badgeClass}">${tx.category}</span></td>
        <td>${tx.region}</td>
        <td>${tx.repName}</td>
        <td>${tx.quantity}</td>
        <td>${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tx.price)}</td>
        <td style="font-weight: 600; color: #fff;">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tx.total)}</td>
      `;
      transactionsBody.appendChild(row);
    });

    // Handle Pagination Details
    const { page, totalPages, total } = data.pagination;
    paginationInfo.innerText = `Showing page ${page} of ${totalPages} (${total} total records)`;
    paginationPrev.disabled = page <= 1;
    paginationNext.disabled = page >= totalPages;
  } catch (err) {
    console.error("Error fetching transactions table:", err);
  }
}

// Ingestion Form Handlers
function openModal() {
  modalOverlay.classList.add('open');
}

function closeModal() {
  modalOverlay.classList.remove('open');
  transactionForm.reset();
  formProduct.disabled = true;
  formProduct.innerHTML = '<option value="">Select a Category First</option>';
}

function populateFormProducts() {
  const selectedCategory = formCategory.value;
  formProduct.innerHTML = '<option value="">Select Product</option>';
  formPrice.value = '';

  if (!selectedCategory) {
    formProduct.disabled = true;
    return;
  }

  const products = PRODUCTS_MAP[selectedCategory];
  products.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.name;
    opt.innerText = p.name;
    formProduct.appendChild(opt);
  });

  formProduct.disabled = false;
}

function setFormPrice() {
  const selectedCategory = formCategory.value;
  const selectedProduct = formProduct.value;

  if (!selectedCategory || !selectedProduct) {
    formPrice.value = '';
    return;
  }

  const productObj = PRODUCTS_MAP[selectedCategory].find(p => p.name === selectedProduct);
  if (productObj) {
    formPrice.value = productObj.price.toFixed(2);
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  
  const payload = {
    customerName: document.getElementById('form-customerName').value,
    category: formCategory.value,
    productName: formProduct.value,
    quantity: parseInt(formQuantity.value, 10),
    price: parseFloat(formPrice.value),
    region: document.getElementById('form-region').value,
    repName: document.getElementById('form-repName').value
  };

  try {
    const response = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to submit transaction");
    }

    showToast("Sales transaction ingested successfully!");
    closeModal();
    refreshDashboard();
  } catch (err) {
    console.error(err);
    showToast(err.message, "error");
  }
}

// Client-Side CSV Export Tool
async function exportCSV() {
  try {
    // Fetch all records by using a large limit value
    const response = await fetch(`/api/sales?page=1&limit=5000&${getQueryString()}`);
    const data = await response.json();
    const rows = data.transactions;

    if (!rows || rows.length === 0) {
      showToast("No data to export", "error");
      return;
    }

    // Define CSV headers
    const headers = ["ID", "Date", "Customer", "Product", "Category", "Quantity", "Price", "Total", "Region", "Rep"];
    
    // Map objects to lines
    const csvLines = [
      headers.join(','),
      ...rows.map(tx => [
        `"${tx.id}"`,
        `"${tx.date}"`,
        `"${tx.customerName.replace(/"/g, '""')}"`,
        `"${tx.productName.replace(/"/g, '""')}"`,
        `"${tx.category}"`,
        tx.quantity,
        tx.price,
        tx.total,
        `"${tx.region}"`,
        `"${tx.repName}"`
      ].join(','))
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvLines.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Export completed! File downloading.");
  } catch (err) {
    console.error("Export failure:", err);
    showToast("Failed to export sales data", "error");
  }
}
