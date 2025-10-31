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
      setTimeout(() => stopScanner(), 500); // slight delay
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
document.getElementById('viewStatus').addEventListener('click', fetchPendingOrders);

async function fetchPendingOrders() {
  try {
    const res = await fetch('https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec');
    const data = await res.json();
    renderCards(data);
  } catch (error) {
    console.error('Error fetching orders:', error);
    alert('Failed to load pending orders.');
  }
}

// === Submit SKU ===
document.getElementById('submitSku').addEventListener('click', submitSku);

async function submitSku() {
  const sku = document.getElementById('skuInput').value.trim();
  if (!sku) return alert("Enter or scan a SKU first");

  try {
    const res = await fetch('https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec', {
      method: 'POST',
      body: new URLSearchParams({ sku })
    });
    const result = await res.text();
    alert(result);
    fetchPendingOrders(); // Refresh cards after update
  } catch (error) {
    console.error('Error submitting SKU:', error);
    alert('Failed to update order status.');
  }
}

// === Render Cards ===
function renderCards(data) {
  const container = document.getElementById('pendingOrdersContainer');
  container.innerHTML = '';

  if (data.length === 0) {
    container.innerHTML = '<p>No pending orders found.</p>';
    return;
  }

  data.forEach(order => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <strong>SKU:</strong> ${order.sku}<br/>
      <strong>Status:</strong> ${order.status}
    `;
    container.appendChild(card);
  });
}

// === Spinner logic ===

const viewStatusBtn = document.getElementById('viewStatus');

function showSpinner(button) {
  const spinner = button.querySelector('.spinner');
  if (spinner) {
    spinner.style.display = 'inline-block';
    button.disabled = true;

    // Simulate loading
    setTimeout(() => {
      spinner.style.display = 'none';
      button.disabled = false;
    }, 3000); // Adjust duration as needed
  }
}

viewStatusBtn.addEventListener('click', () => {
  showSpinner(viewStatusBtn);
});

// JavaScript to Open and Print

fetch('https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec', {
  method: 'POST',
  body: new URLSearchParams({ sku: scannedSku })
})
.then(res => res.json())
.then(data => {
  if (data.labelLink) {
    const printWindow = window.open(data.labelLink, '_blank');

    // Wait for the label to load, then trigger print
    printWindow.onload = () => {
      printWindow.print();
    };
  }
});

.then(data => {
  if (data.labelLink) {
    const printWindow = window.open(data.labelLink, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    } else {
      alert("Popup blocked. Please allow popups for this site.");
    }
  } else {
    alert("Label link not found.");
  }
})
.catch(err => {
  console.error("Error:", err);
  alert("Failed to fetch label link.");
});
