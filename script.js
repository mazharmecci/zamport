// === QR Scanner Setup ===
let scannerActive = false;
let qrInstance = null;

const scanBtn = document.getElementById('scanBox');
const closeBtn = document.getElementById('closeScanner');
const qrReader = document.getElementById('qr-reader');
const skuInput = document.getElementById('skuInput');

scanBtn.addEventListener('click', () => {
  if (scannerActive) return;
  scannerActive = true;

  qrReader.style.display = 'block';
  closeBtn.style.display = 'inline-block';

  qrInstance = new Html5Qrcode("qr-reader");
  qrInstance.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 300 },
    (decodedText) => {
      skuInput.value = decodedText;
      setTimeout(() => stopScanner(), 500);
    },
    (errorMessage) => {
      console.warn(errorMessage);
    }
  );
});

closeBtn.addEventListener('click', stopScanner);

function stopScanner() {
  if (qrInstance) {
    qrInstance.stop().then(() => {
      qrReader.style.display = 'none';
      closeBtn.style.display = 'none';
      scannerActive = false;
      qrInstance.clear();
      qrInstance = null;
    }).catch(err => {
      console.error("Failed to stop scanner:", err);
    });
  }
}

// === View Pending Orders ===

document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('orderDate');
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;
  dateInput.addEventListener('change', fetchPendingOrders);
});

const viewStatusBtn = document.getElementById('viewStatus');
viewStatusBtn.addEventListener('click', fetchPendingOrders);

async function fetchPendingOrders() {
  showSpinner(viewStatusBtn);

  const selectedDate = document.getElementById('orderDate').value;
  if (!selectedDate) {
    showToast("Please select a date first.");
    hideSpinner(viewStatusBtn);
    return;
  }

  try {
    const res = await fetch(`https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec?mode=pendingByDate&date=${selectedDate}`);
    const data = await res.json();
    renderPendingCards(data);
  } catch (error) {
    console.error('Error fetching orders:', error);
    showToast('Failed to load pending orders.');
  } finally {
    hideSpinner(viewStatusBtn);
  }
}

// === Submit SKU ===

document.getElementById('submitSku').addEventListener('click', submitSku);

async function submitSku() {
  const sku = skuInput.value.trim();
  if (!sku) {
    alert("Enter or scan a SKU first");
    return;
  }

  const submitBtn = document.getElementById('submitSku');
  const spinner = submitBtn.querySelector('.spinner');

  showSpinner(submitBtn);

  try {
    const response = await fetch(
      'https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec',
      {
        method: 'POST',
        body: new URLSearchParams({ sku }),
      }
    );

    const result = await response.json();
    showToast(result.message || result);

    if (result.labelLink) {
      const printWindow = window.open(result.labelLink, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          showToast("Label sent to printer!");
          skuInput.value = "";
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
    hideSpinner(submitBtn);
  }
}

// === Render Cards ===

function renderPendingCards(data) {
  const container = document.getElementById('pendingOrdersContainer');
  container.innerHTML = '';

  if (!data || data.length === 0) {
    container.innerHTML = '<p>No pending orders found.</p>';
    return;
  }

  data.forEach(order => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <strong>SKU:</strong> ${order.sku}<br/>
      <strong>Product:</strong> ${order.product || 'N/A'}<br/>
      <strong>Status:</strong> ${order.status}<br/>
      <strong>Sheet:</strong> ${order.sheetName}
    `;
    container.appendChild(card);
  });
}

// === Spinner logic ===
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
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "show";
  setTimeout(() => {
    toast.className = toast.className.replace("show", "");
  }, 3000);
}

// === 3PL Summary ===

async function load3PLSummary() {
  const tableBody = document.getElementById('threePLTableBody');
  tableBody.innerHTML = '';

  const endpoint = 'https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec?mode=3pl';

  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`Server responded with status ${response.status}`);

    const summary = await response.json();
    if (!Array.isArray(summary)) throw new Error('Invalid data format received');

    let grandTotal = 0;

    summary.forEach((item, index) => {
      const row = document.createElement('tr');
      if (index % 2 === 1) row.classList.add('alt-row');

      const sheetLinkCell = document.createElement('td');
      const link = document.createElement('a');
      link.href = item.sheetId ? `https://docs.google.com/spreadsheets/d/${item.sheetId}` : '#';
      link.target = '_blank';
      link.textContent = `Sheet ${index + 1}`;
      sheetLinkCell.appendChild(link);

      const sheetNameCell = document.createElement('td');
      sheetNameCell.textContent = item.sheetName || 'Unnamed';

      const costCell = document.createElement('td');
      costCell.textContent = item.total3PLCost ? `$${Number(item.total3PLCost).toFixed(2)}` : '$0.00';

      row.appendChild(sheetLinkCell);
      row.appendChild(sheetNameCell);
      row.appendChild(costCell);
      tableBody.appendChild(row);

      grandTotal += Number(item.total3PLCost) || 0;
    });

    const totalRow = document.createElement('tr');
    totalRow.classList.add('grand-total');
    totalRow.innerHTML = `
      <td colspan="2"><strong>Grand Total</strong></td>
      <td><strong>$${grandTotal.toFixed(2)}</strong></td>
    `;
    tableBody.appendChild(totalRow);
  } catch (error) {
    console.error('Error loading 3PL summary:', error);
    showToast(`Failed to load 3PL cost summary: ${error.message}`);
  }
}

function toggle3PLTable() {
  const wrapper = document.getElementById('threePLWrapper');
  wrapper.classList.toggle('active');
}


// === Product Filter ===

async function loadFilteredOrders() {
  const selectedProduct = document.getElementById('productFilter').value;
  const baseUrl = 'https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec';
  const endpoint = selectedProduct
    ? `${baseUrl}?product=${encodeURIComponent(selectedProduct)}`
    : baseUrl;

  try {
    const response = await fetch(endpoint);
    const orders = await response.json();
    renderPendingCards(orders);
  } catch (error) {
    console.error('Error loading filtered orders:', error);
    showToast('Failed to load filtered orders.');
  }
}


// Load Product Dropdown logic with evenlistener

document.addEventListener('DOMContentLoaded', () => {
  loadProductDropdown();
});

async function loadProductDropdown() {
  const dropdown = document.getElementById('productFilter');
  if (!dropdown) {
    console.warn('Product filter dropdown not found.');
    return;
  }

  dropdown.innerHTML = '<option value="">All Products</option>';

  try {
    const endpoint = 'https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec?mode=products';
    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const products = await response.json();
    if (!Array.isArray(products)) {
      throw new Error('Invalid product data format');
    }

    products.sort().forEach(product => {
      if (product && typeof product === 'string') {
        const option = document.createElement('option');
        option.value = product;
        option.textContent = product;
        dropdown.appendChild(option);
      }
    });

    console.log('Product dropdown loaded:', products);
  } catch (error) {
    console.error('Error loading products:', error);
    showToast('Failed to load product list.');
  }
}


