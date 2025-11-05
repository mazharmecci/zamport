// === Constants ===
const API_BASE = 'https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec';

const selectors = {
  dateInput: document.getElementById('orderDate'),
  viewStatusBtn: document.getElementById('viewStatus'),
  submitBtn: document.getElementById('submitSku'),
  skuInput: document.getElementById('skuInput'),
  pendingContainer: document.getElementById('pendingOrdersContainer'),
  toast: document.getElementById('toast'),
};

// === Initialization ===
document.addEventListener('DOMContentLoaded', () => {
  selectors.dateInput.value = new Date().toISOString().split('T')[0];
  selectors.dateInput.addEventListener('change', fetchPendingOrders);
  selectors.viewStatusBtn.addEventListener('click', fetchPendingOrders);
  selectors.submitBtn.addEventListener('click', submitSku); 
});

// === Fetch Pending Orders ===
async function fetchPendingOrders() {
  showSpinner(selectors.viewStatusBtn);

  const rawDate = selectors.dateInput.value;
  if (!rawDate) {
    showToast("Please select a date first.");
    hideSpinner(selectors.viewStatusBtn);
    return;
  }

  const formattedDate = formatDateForBackend(rawDate);
  console.log("Formatted date sent to backend:", formattedDate);

  selectors.pendingContainer.innerHTML = '';

  try {
    const res = await fetch(`${API_BASE}?mode=pendingByDate&date=${formattedDate}`);
    const data = await res.json();
    renderPendingCards(data);
  } catch (error) {
    console.error('Error fetching orders:', error);
    showToast('Failed to load pending orders.');
  } finally {
    hideSpinner(selectors.viewStatusBtn);
  }
}

function formatDateForBackend(dateStr) {
  const dateObj = new Date(dateStr);
  return `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`;
}

// === Render Pending Order Cards ===
function renderPendingCards(data) {
  selectors.pendingContainer.innerHTML = '';

  if (!data || data.length === 0) {
    selectors.pendingContainer.innerHTML = '<p>No pending orders found.</p>';
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
    selectors.pendingContainer.appendChild(card);
  });
}

// === Submit SKU ===
async function submitSku() {
  const sku = selectors.skuInput.value.trim();
  if (!sku) {
    alert("Enter or scan a SKU first");
    return;
  }

  showSpinner(selectors.submitBtn);

  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      body: new URLSearchParams({ sku }),
    });

    const result = await response.json();
    showToast(result.message || result);

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

    fetchPendingOrders(); // Refresh after update
  } catch (error) {
    console.error('Error submitting SKU:', error);
    showToast("Failed to update order status.");
  } finally {
    hideSpinner(selectors.submitBtn);
  }
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
    selectors.toast.className = selectors.toast.className.replace("show", "");
  }, 3000);
}
