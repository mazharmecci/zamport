// === DOMContentLoaded Initialization ===
document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('orderDate');
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;
  dateInput.addEventListener('change', fetchPendingOrders);

  loadProductDropdown();
});

// === View Pending Orders ===
const viewStatusBtn = document.getElementById('viewStatus');
viewStatusBtn.addEventListener('click', fetchPendingOrders);

async function fetchPendingOrders() {
  showSpinner(viewStatusBtn);

  const selectedDateRaw = document.getElementById('orderDate').value;
  if (!selectedDateRaw) {
    showToast("Please select a date first.");
    hideSpinner(viewStatusBtn);
    return;
  }

  const selectedDateObj = new Date(selectedDateRaw);
  const selectedDate = `${selectedDateObj.getMonth() + 1}/${selectedDateObj.getDate()}/${selectedDateObj.getFullYear()}`; // MM/DD/YYYY

  document.getElementById('pendingOrdersContainer').innerHTML = ''; // Clear old cards

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

// === Submit SKU ===
document.getElementById('submitSku').addEventListener('click', submitSku);

async function submitSku() {
  const skuInput = document.getElementById('skuInput');
  const sku = skuInput.value.trim();
  if (!sku) {
    alert("Enter or scan a SKU first");
    return;
  }

  const submitBtn = document.getElementById('submitSku');
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
