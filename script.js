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

const viewStatusBtn = document.getElementById('viewStatus');
viewStatusBtn.addEventListener('click', fetchPendingOrders);

async function fetchPendingOrders() {
  showSpinner(viewStatusBtn);

  try {
    const res = await fetch('https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec');
    const data = await res.json();
    console.log("Fetched data:", data);
    renderCards(data);
  } catch (error) {
    console.error('Error fetching orders:', error);
    alert('Failed to load pending orders.');
  } finally {
    const spinner = viewStatusBtn.querySelector('.spinner');
    if (spinner) {
      spinner.style.display = 'none';
      viewStatusBtn.disabled = false;
    }
  }
}

// === Submit SKU ===

// Bind the click event early
document.getElementById('submitSku').addEventListener('click', submitSku);

async function submitSku() {
  const skuInput = document.getElementById('skuInput');
  const sku = skuInput.value.trim();
  if (!sku) {
    alert("Enter or scan a SKU first");
    return;
  }

  const submitBtn = document.getElementById('submitSku');
  const spinner = submitBtn.querySelector('.spinner');

  // Show spinner and disable button
  spinner.classList.add('active');
  submitBtn.disabled = true;

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
          skuInput.value = ""; // Clear input after print dialog opens
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
    // Hide spinner and re-enable button
    spinner.classList.remove('active');
    submitBtn.disabled = false;
  }
}

// === Render Cards ===

function renderCards(data) {
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

// === Toast Notification ===

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "show";
  setTimeout(() => {
    toast.className = toast.className.replace("show", "");
  }, 3000);
}

function toggle3PLTable() {
  const wrapper = document.getElementById('threePLWrapper');
  wrapper.style.display = wrapper.style.display === 'none' ? 'block' : 'none';
}

async function load3PLSummary() {
  const tableBody = document.getElementById('threePLTableBody');
  tableBody.innerHTML = ''; // Clear previous rows

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
      link.href = `https://docs.google.com/spreadsheets/d/${item.sheetId}`;
      link.target = '_blank';
      link.textContent = `Sheet ${index + 1}`;
      sheetLinkCell.appendChild(link);

      const sheetNameCell = document.createElement('td');
      sheetNameCell.textContent = item.sheetName;

      const costCell = document.createElement('td');
      costCell.textContent = `$${parseFloat(item.total3PLCost).toFixed(2)}`;

      row.appendChild(sheetLinkCell);
      row.appendChild(sheetNameCell);
      row.appendChild(costCell);
      tableBody.appendChild(row);

      grandTotal += parseFloat(item.total3PLCost) || 0;
    });

    // Add Grand Total row
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

