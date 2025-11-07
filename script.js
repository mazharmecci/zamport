// === Zamport Login Constants ===

(function enforceSession() {
  const SESSION_KEY = "zamport-auth";
  const LAST_ACTIVE_KEY = "zamport-last-active";
  const MAX_IDLE_TIME = 15 * 60 * 1000; // 15 minutes

  const isLoggedIn = sessionStorage.getItem(SESSION_KEY) === "true";
  const lastActive = parseInt(sessionStorage.getItem(LAST_ACTIVE_KEY), 10);
  const now = Date.now();

  const isSessionExpired = !lastActive || (now - lastActive > MAX_IDLE_TIME);

  if (!isLoggedIn || isSessionExpired) {
    showToast("Session expired. Please log in again.");
    sessionStorage.clear();
    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000); // show toast for 2 seconds before redirect
  } else {
    sessionStorage.setItem(LAST_ACTIVE_KEY, now); // refresh activity
  }
})();

const username = sessionStorage.getItem("zamport-user");
if (username) {
  document.getElementById("usernameDisplay").textContent = username.charAt(0).toUpperCase() + username.slice(1);
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  sessionStorage.clear();
  showToast("You’ve been logged out.");
  setTimeout(() => {
    window.location.href = "index.html";
  }, 1500);
});

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
};

// === Initialization ===
document.addEventListener('DOMContentLoaded', () => {
  selectors.submitBtn?.addEventListener('click', submitSku);
  selectors.viewStatusBtn?.addEventListener('click', fetchPendingOrders);
  selectors.productFilter?.addEventListener('change', loadFilteredOrders);
  selectors.threePLSummaryBtn?.addEventListener('click', async () => {
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
  loadProductDropdown();
});

// === Fetch Pending Orders ===
async function fetchPendingOrders(product = '') {
  showSpinner(selectors.viewStatusBtn);
  selectors.pendingContainer.innerHTML = '';

  const endpoint = product
    ? `${API_BASE}?product=${encodeURIComponent(product)}`
    : API_BASE;

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

// === Submit SKU ===
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

// === Render Cards ===

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


// === Spinner Logic ===
function showSpinner(button) {
  const spinner = button.querySelector('.spinner');
  if (spinner) {
    spinner.style.display = 'inline-block';
    button.disabled = true;
  }
}

function hideSpinner(button) {
  const spinner = button.querySelector('.spinner');
  if (spinner) {
    spinner.style.display = 'none';
    button.disabled = false;
  }
}

// === Toast Notification ===
function showToast(message) {
  selectors.toast.textContent = message;
  selectors.toast.className = "show";
  setTimeout(() => {
    selectors.toast.classList.remove("show");
  }, 3000);
}

// === 3PL Summary ===
async function load3PLSummary() {
  selectors.threePLTableBody.innerHTML = '';

  try {
    const endpoint = `${API_BASE}?mode=3pl`;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`Server responded with status ${response.status}`);

    const summary = await response.json();
    if (!Array.isArray(summary)) throw new Error('Invalid data format received');

    let grandTotal = 0;

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

function toggle3PLTable() {
  selectors.threePLWrapper.classList.toggle('active');
}

function showLoader() {
  selectors.threePLLoader?.classList.remove('hidden');
}

function hideLoader() {
  selectors.threePLLoader?.classList.add('hidden');
}

// === Product Filter ===
async function loadFilteredOrders() {
  const selectedProduct = selectors.productFilter.value.trim();
  fetchPendingOrders(selectedProduct);
}

async function loadProductDropdown() {
  if (!selectors.productFilter) return;

  selectors.productFilter.innerHTML = '<option value="">All Products</option>';

  try {
    const endpoint = `${API_BASE}?mode=products`;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`Server responded with status ${response.status}`);

    const products = await response.json();
    if (!Array.isArray(products)) throw new Error('Invalid product data format');

    products.sort().forEach(product => {
      if (product && typeof product === 'string') {
        const option = document.createElement('option');
        option.value = product;
        option.textContent = product;
        selectors.productFilter.appendChild(option);
      }
    });

    console.log('Product dropdown loaded:', products);
  } catch (error) {
    console.error('Error loading products:', error);
    showToast('Failed to load product list.');
  }
}

// SKU Vault

function openVault(skuData) {
  const vault = document.getElementById("skuVault");
  const details = document.getElementById("vaultDetails");

  const doi = skuData.G && skuData.G !== "missing" ? excelSerialToDate(skuData.G) : "—";
  const warranty = skuData.H && skuData.H !== "missing" ? excelSerialToDate(skuData.H) : "—";

  details.innerHTML = `
    <p><strong>SKU:</strong> ${skuData.A}</p>
    <p><strong>Customer:</strong> ${skuData.B}</p>
    <p><strong>State:</strong> ${skuData.C}</p>
    <p><strong>Instrument:</strong> ${skuData.D}</p>
    <p><strong>Sheet:</strong> ${skuData.E}</p>
    <p><strong>3PL Cost:</strong> ₹${skuData.F}</p>
    <p><strong>DOI:</strong> ${doi}</p>
    <p><strong>Warranty:</strong> ${warranty}</p>
  `;

  vault.classList.remove("hidden");
}

function closeVault() {
  document.getElementById("skuVault").classList.add("hidden");
}

const skuValue = document.getElementById("skuInput").value.trim();
const matched = crmData.find(row => row.A === skuValue);
if (matched) {
  openVault(matched);
} else {
  showToast("SKU not found.");
}

// Filter dropdown reload button

const reloadBtn = document.getElementById("reloadProductsBtn");

reloadBtn?.addEventListener("click", async () => {
  const spinner = reloadBtn.querySelector(".spinner");
  spinner.classList.remove("hidden");
  reloadBtn.disabled = true;

  try {
    await loadProductDropdown(); // Refresh dropdown options
    const selectedProduct = selectors.productFilter.value.trim(); // Get current filter
    await fetchPendingOrders(selectedProduct); // Reload cards based on filter
    showToast("Product list and cards refreshed.");
  } catch (error) {
    console.error("Reload failed:", error);
    showToast("Failed to reload products and cards.");
  } finally {
    spinner.classList.add("hidden");
    reloadBtn.disabled = false;
  }
});


