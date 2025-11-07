// === Session Enforcement ===
(function enforceSession() {
  const SESSION_KEY = "zamport-auth";
  const LAST_ACTIVE_KEY = "zamport-last-active";
  const MAX_IDLE_TIME = 15 * 60 * 1000;

  const isLoggedIn = sessionStorage.getItem(SESSION_KEY) === "true";
  const lastActive = parseInt(sessionStorage.getItem(LAST_ACTIVE_KEY), 10);
  const now = Date.now();

  if (!isLoggedIn || !lastActive || now - lastActive > MAX_IDLE_TIME) {
    showToast("Session expired. Please log in again.");
    sessionStorage.clear();
    setTimeout(() => window.location.href = "index.html", 2000);
  } else {
    sessionStorage.setItem(LAST_ACTIVE_KEY, now);
  }
})();

// === Constants ===
const API_BASE = 'https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec';

const selectors = {
  skuInput: document.getElementById('skuInput'),
  submitBtn: document.getElementById('submitSku'),
  viewStatusBtn: document.getElementById('viewStatus'),
  pendingContainer: document.getElementById('pendingOrdersContainer'),
  toast: document.getElementById('toast'),
  productFilter: document.getElementById('productFilter'),
  threePLTableBody: document.getElementById('threePLTableBody'),
  threePLWrapper: document.getElementById('threePLWrapper'),
  threePLSummaryBtn: document.getElementById('threePLSummaryBtn'),
  threePLLoader: document.getElementById('threePLLoader'),
  reloadBtn: document.getElementById("reloadProductsBtn"),
  loadingOverlay: document.getElementById("loadingOverlay"),
  currentMonthBody: document.getElementById("currentMonth3PLBody"),
  currentMonthTotal: document.getElementById("currentMonthTotal"),
};

// === DOM Ready ===
document.addEventListener("DOMContentLoaded", () => {
  const username = sessionStorage.getItem("zamport-user");
  if (username) {
    document.getElementById("usernameDisplay").textContent = username.charAt(0).toUpperCase() + username.slice(1);
  }

  document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.clear();
    showToast("You’ve been logged out.");
    setTimeout(() => window.location.href = "index.html", 1500);
  });

  selectors.submitBtn?.addEventListener("click", submitSku);
  selectors.viewStatusBtn?.addEventListener("click", () => {
    const selectedProduct = selectors.productFilter.value.trim();
    fetchPendingOrders(selectedProduct);
  });
  selectors.productFilter?.addEventListener("change", loadFilteredOrders);
  selectors.threePLSummaryBtn?.addEventListener("click", async () => {
    toggle3PLTable();
    showSpinner(selectors.threePLSummaryBtn);
    showLoader();
    try {
      await load3PLSummary();
    } finally {
      hideLoader();
      hideSpinner(selectors.threePLSummaryBtn);
    }
  });

  selectors.reloadBtn?.addEventListener("click", async () => {
    const spinner = selectors.reloadBtn.querySelector(".spinner");
    spinner.classList.remove("hidden");
    selectors.reloadBtn.disabled = true;
    selectors.loadingOverlay.classList.remove("hidden");

    try {
      await loadProductDropdown();
      const selectedProduct = selectors.productFilter.value.trim();
      await fetchPendingOrders(selectedProduct);
      showToast("Product list and cards refreshed.");
    } catch (error) {
      console.error("Reload failed:", error);
      showToast("Failed to reload products and cards.");
    } finally {
      spinner.classList.add("hidden");
      selectors.reloadBtn.disabled = false;
      selectors.loadingOverlay.classList.add("hidden");
    }
  });

  loadProductDropdown();
  loadCurrentMonth3PLSummary();
});

// === Fetch & Render ===
async function fetchPendingOrders(product = '') {
  showSpinner(selectors.viewStatusBtn);
  selectors.pendingContainer.innerHTML = '';

  const endpoint = product ? `${API_BASE}?product=${encodeURIComponent(product)}` : API_BASE;

  try {
    const res = await fetch(endpoint);
    const data = await res.json();
    renderPendingCards(data);
  } catch (error) {
    console.error('Error fetching orders:', error);
    showToast('Failed to load pending orders.');
  } finally {
    hideSpinner(selectors.viewStatusBtn);
  }
}

function renderPendingCards(data) {
  selectors.pendingContainer.innerHTML = '';

  if (!Array.isArray(data) || data.length === 0) {
    selectors.pendingContainer.innerHTML = '<p>No valid pending orders found for this month.</p>';
    return;
  }

  data.forEach(({ sku, product, status, sheetName, labelLink }) => {
    const card = document.createElement('div');
    card.className = 'card';
    const labelHTML = labelLink
      ? `<a href="${labelLink}" target="_blank" class="label-link">🖨️ Print Label</a>`
      : '<em>No label link</em>';

    card.innerHTML = `
      <strong>SKU:</strong> ${sku}<br/>
      <strong>Product:</strong> ${product}<br/>
      <strong>Status:</strong> ${status}<br/>
      <strong>Sheet:</strong> ${sheetName}<br/>
      ${labelHTML}
    `;
    selectors.pendingContainer.appendChild(card);
  });
}

// === SKU Submit ===
async function submitSku() {
  const sku = selectors.skuInput.value.trim();
  if (!sku) return alert("Enter or scan a SKU first");

  showSpinner(selectors.submitBtn);

  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      body: new URLSearchParams({ sku }),
    });

    const result = await response.json();
    showToast(result.message || 'Update complete');

    if (result.labelLink) {
      const printWindow = window.open(result.labelLink, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          showToast("Label sent to printer!");
          selectors.skuInput.value = "";
        };
      } else {
        showToast("Popup blocked. Please allow popups.");
      }
    }

    fetchPendingOrders();
  } catch (error) {
    console.error('Error submitting SKU:', error);
    showToast("Failed to update order status.");
  } finally {
    hideSpinner(selectors.submitBtn);
  }
}

// === 3PL Summary ===
async function load3PLSummary() {
  selectors.threePLTableBody.innerHTML = '';
  let grandTotal = 0;

  try {
    const endpoint = `${API_BASE}?mode=3pl`;
    const response = await fetch(endpoint);
    const summary = await response.json();

    summary.forEach((item, index) => {
      const row = document.createElement('tr');
      if (index % 2 === 1) row.classList.add('alt-row');

      row.innerHTML = `
        <td><a href="https://docs.google.com/spreadsheets/d/${item.sheetId}" target="_blank">Sheet ${index + 1}</a></td>
        <td>${item.sheetName || 'Unnamed'}</td>
        <td>$${Number(item.total3PLCost || 0).toFixed(2)}</td>
      `;
      selectors.threePLTableBody.appendChild(row);
      grandTotal += Number(item.total3PLCost) || 0;
    });

    const totalRow = document.createElement('tr');
    totalRow.classList.add('grand-total');
    totalRow.innerHTML = `
      <td colspan="2"><strong>Grand Total</strong></td>
      <td><strong>$${grandTotal.toFixed(2)}</strong></td>
    `;
    selectors.threePLTableBody.appendChild(totalRow);
  } catch (error) {
    console.error('Error loading 3PL summary:', error);
    showToast(`Failed to load 3PL cost summary: ${error.message}`);
  }
}

// === Current Month Summary ===
async function loadCurrentMonth3PLSummary() {
  selectors.currentMonthBody.innerHTML = '';
  let grandTotal = 0;

  try {
    const endpoint = `${API_BASE}?mode=3pl`;
    const response = await fetch(endpoint);
    const summary = await response.json();

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();

    const filtered = summary.filter(item => {
      const sheetDate = extractDateFromSheetName(item.sheetName);
      return (
        sheetDate &&
        sheetDate.getMonth() === currentMonth &&
        sheetDate.getFullYear() === currentYear &&
        sheetDate.getDate() <= currentDay
      );
    });

    filtered.forEach((item, index) =>
