// === Constants ===
const API_BASE = 'https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec';
const dateInput = document.getElementById('orderDate');
const viewStatusBtn = document.getElementById('viewStatus');
const submitBtn = document.getElementById('submitSku');
const skuInput = document.getElementById('skuInput');
const pendingContainer = document.getElementById('pendingOrdersContainer');
const toast = document.getElementById('toast');

// === Initialization ===
document.addEventListener('DOMContentLoaded', () => {
  dateInput.value = new Date().toISOString().split('T')[0];
  dateInput.addEventListener('change', fetchPendingOrders);
  viewStatusBtn.addEventListener('click', fetchPendingOrders);
  submitBtn.addEventListener('click', submitSku);
  loadProductDropdown(); // Optional external function
});

// === Fetch Pending Orders ===
async function fetchPendingOrders() {
  showSpinner(viewStatusBtn);

  const selectedDateRaw = dateInput.value;
  if (!selectedDateRaw) {
    showToast("Please select a date first.");
    hideSpinner(viewStatusBtn);
    return;
  }

  const selectedDate = formatDateForBackend(selectedDateRaw);
  console.log("Formatted date sent to backend:", selectedDate);

  pendingContainer.innerHTML = '';

  try {
    const res = await fetch(`${API_BASE}?mode=pendingByDate&date=${selectedDate}`);
    const data = await res.json();
    renderPendingCards(data);
  } catch (error) {
    console.error('Error fetching orders:', error);
    showToast('Failed to load pending orders.');
  } finally {
    hideSpinner(viewStatusBtn);
  }
}

function formatDateForBackend(dateStr) {
  const dateObj = new Date(dateStr);
  return `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`;
}

// === Render Cards ===
function renderPendingCards(data) {
  pendingContainer.innerHTML = '';

  if (!data || data.length === 0) {
    pendingContainer.innerHTML = '<p>No pending orders found.</p>';
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
    pendingContainer.appendChild(card);
  });
}

// === Submit SKU ===
async function submitSku() {
  const sku = skuInput.value.trim();
  if (!sku) {
    alert("Enter or scan a SKU first");
    return;
  }

  showSpinner(submitBtn);

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
          skuInput.value = "";
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
    hideSpinner(submitBtn);
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
  toast.textContent = message;
  toast.className = "show";
  setTimeout(() => {
    toast.className = toast.className.replace("show", "");
  }, 3000);
}
