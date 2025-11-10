// === Global State ===
let currentOrders = [];

// === Escape Helper ===
function escapeHTML(str) {
  return typeof str === "string"
    ? str.replace(/[&<>"']/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[tag]))
    : '';
}

// === Toast Notification ===
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3000);
}

// === UI Helpers ===
function toggleSpinner(button, show) {
  const spinner = button?.querySelector(".spinner");
  if (spinner) spinner.classList.toggle("hidden", !show);
}

function showLoadingOverlay(show) {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) overlay.classList.toggle("hidden", !show);
}

function populateProductDropdown(products = []) {
  const filter = document.getElementById("productFilter");
  if (!filter) return;
  filter.innerHTML = `<option value="">All Products</option>`;
  products.forEach(p => {
    const option = document.createElement("option");
    option.value = p;
    option.textContent = p;
    filter.appendChild(option);
  });
}

// === Normalize Order Keys ===

function normalizeOrder(order) {
  const rawImageLink = order.imageLink || order.ImageLink || order.imageURL || order.ImageURL || "";

  // Extract from IMAGE(...) formula if needed
  const imageLink = rawImageLink.startsWith('=IMAGE("') ? rawImageLink.slice(8, -2) : rawImageLink;

  return {
    sku: order.sku || order.SKU || "",
    product: order.product || order.Product || "",
    status: order.status || order.Status || "",
    sheetName: order.sheetName || order.Sheet || "",
    sheetId: order.sheetId || order.SheetID || "",
    rowIndex: order.rowIndex || order.RowIndex || 0,
    date: order.date || order.Date || "",
    totalLabels: order.totalLabels || order.Labels || "",
    totalUnits: order.totalUnits || order.Units || "",
    labelLink: order.labelLink || order.LabelLink || "",
    imageLink
  };
}


// === Card Builder ===

function buildOrderCardHTML(order) {
  const statusColor = order.status === "Order-Pending" ? "red" : "green";
  const imagePreview = order.imageLink ? `<img src="${escapeHTML(order.imageLink)}" alt="Product Image" style="max-width:120px; margin-top:6px;" />` : "";

  return `
    <h4>📦 SKU: ${escapeHTML(order.sku)}</h4>
    <p>🧪 Product: ${escapeHTML(order.product)}</p>
    <p>📌 Status: <span style="color:${statusColor}; font-weight:bold;">${escapeHTML(order.status)}</span></p>
    <p>📄 Sheet: ${escapeHTML(order.sheetName)}</p>
    <p>📅 Date: ${escapeHTML(order.date || "N/A")}</p>
    <p>🔢 Total Labels: ${escapeHTML(order.totalLabels || "N/A")}</p>
    <p>📦 Total Units: ${escapeHTML(order.totalUnits || "N/A")}</p>
    ${order.labelLink ? `<p><a href="${escapeHTML(order.labelLink)}" target="_blank">🔗 Label Link</a></p>` : ""}
    ${order.imageLink ? `<p><a href="${escapeHTML(order.imageLink)}" target="_blank">🖼️ Image Link</a></p>${imagePreview}` : ""}
  `;
}


// === Dispatch Button ===
function createDispatchButton(order) {
  const btn = document.createElement("button");
  btn.textContent = "Mark as Dispatched";
  btn.className = "dispatch-btn";
  btn.onclick = () => markOrderAsDispatched(order, btn);
  return btn;
}

// === Dispatched Badge ===
function createDispatchedBadge() {
  const badge = document.createElement("span");
  badge.className = "dispatched-badge";
  badge.textContent = "✅ Dispatched";
  return badge;
}

// === Card Renderer ===
function createDispatchableOrderCard(rawOrder) {
  const order = normalizeOrder(rawOrder);
  const card = document.createElement("div");
  card.className = "order-card";
  card.innerHTML = buildOrderCardHTML(order);
  card.appendChild(order.status === "Order-Pending" ? createDispatchButton(order) : createDispatchedBadge());
  return card;
}

// === Render Orders ===
function renderPendingOrders(orders) {
  const container = document.getElementById("pendingOrdersContainer");
  if (!container) return;
  container.innerHTML = "";
  if (!orders.length) {
    container.innerHTML = "<p>No pending orders found.</p>";
    return;
  }
  const fragment = document.createDocumentFragment();
  orders.forEach((order, i) => {
    const card = createDispatchableOrderCard(order);
    card.style.animationDelay = `${i * 80}ms`;
    fragment.appendChild(card);
  });
  container.appendChild(fragment);
}

// === Fetch Orders ===
function fetchAndRenderOrders(product = "") {
  showLoadingOverlay(true);
  showToast("⏳ Fetching your orders...");
  const API_URL = "https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec";
  const url = product ? `${API_URL}?mode=3pl-month&product=${encodeURIComponent(product)}` : `${API_URL}?mode=3pl-month`;
  fetch(url)
    .then(res => res.json())
    .then(orders => {
      currentOrders = orders;
      renderPendingOrders(currentOrders);
    })
    .catch(err => {
      console.error("Order fetch failed:", err);
      showToast("❌ Failed to load orders.");
    })
    .finally(() => showLoadingOverlay(false));
}

// === Dispatch Logic ===
function markOrderAsDispatched(order, btn) {
  showToast("🔄 Updating status...");
  const API_URL = "https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec";
  const payload = {
    sku: order.sku,
    sheetId: order.sheetId,
    sheetName: order.sheetName,
    rowIndex: order.rowIndex,
    newStatus: "Order-Dispatched"
  };
  btn.disabled = true;
  btn.textContent = "Dispatching...";
  btn.style.opacity = "0.7";
  btn.style.cursor = "not-allowed";

  fetch(API_URL, {
    method: "POST",
    body: new URLSearchParams(payload)
  })
    .then(res => res.json())
    .then(() => {
      showToast("✅ Order marked as dispatched!");
      const updated = currentOrders.find(o =>
        o.sku === order.sku &&
        o.sheetId === order.sheetId &&
        o.sheetName === order.sheetName &&
        o.rowIndex === order.rowIndex
      );
      if (updated) updated.status = "Order-Dispatched";
      btn.textContent = "✅ Dispatched";
      btn.style.backgroundColor = "#28a745";
      btn.style.opacity = "1";
      btn.style.cursor = "default";
      btn.style.boxShadow = "none";
    })
    .catch(err => {
      console.error("Dispatch failed:", err);
      showToast("❌ Failed to update order.");
      btn.disabled = false;
      btn.textContent = "Marked as Dispatched";
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
    });
}

// === DOM Ready ===
document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec";

  if (sessionStorage.getItem("zamport-auth") !== "true") {
    window.location.href = "https://mazharmecci.github.io/zamport/";
    return;
  }

  showLoadingOverlay(true);
  showToast("✅ Login successful!");

  const usernameDisplay = document.getElementById("usernameDisplay");
  const userName = sessionStorage.getItem("zamport-user");
  if (usernameDisplay && userName) usernameDisplay.textContent = userName;

  fetch(`${API_URL}?mode=products`)
    .then(res => res.json())
    .then(products => populateProductDropdown(products))
    .catch(err => {
      console.error("Product fetch failed:", err);
      showToast("❌ Failed to load product list.");
    })
    .finally(() => fetchAndRenderOrders());

  document.getElementById("viewStatus")?.addEventListener("click", () => {
    const btn = document.getElementById("viewStatus");
    toggleSpinner(btn, true);
    fetch(`${API_URL}?mode=products`)
      .then(res => res.json())
      .then(products => {
        populateProductDropdown(products);
        fetchAndRenderOrders();
      })
      .catch(err => {
        console.error("View status failed:", err);
        showToast("❌ Failed to load product list.");
      })
      .finally(() => toggleSpinner(btn, false));
  });

  document.getElementById("productFilter")?.addEventListener("change", e => {
    fetchAndRenderOrders(e.target.value);
  });

    document.getElementById("refreshOrdersBtn")?.addEventListener("click", () => {
    const selectedProduct = document.getElementById("productFilter")?.value || "";
    fetchAndRenderOrders(selectedProduct);
  });

  
// === QR Scanner Setup ===
let scannerInstance = null;

function startQRScanner() {
  if (scannerInstance) return; // Prevent multiple renders

  scannerInstance = new Html5QrcodeScanner("my-qr-reader", {
    fps: 10,
    qrbox: 250,
  });

  scannerInstance.render(onScanSuccess);
}

function onScanSuccess(decodedText, decodedResult) {
  const qrField = document.getElementById("qr-result");
  if (qrField) {
    qrField.value = decodedText;
    showToast("✅ QR Code scanned: " + decodedText);
  } else {
    console.warn("QR result field not found in DOM.");
  }

  // Optional: stop scanning after success
  scannerInstance.clear().then(() => {
    document.getElementById("my-qr-reader").innerHTML = "";
    scannerInstance = null;
  }).catch(err => {
    console.error("Failed to clear scanner:", err);
  });
}


  // === Logout Handler ===
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", event => {
      event.preventDefault();
      sessionStorage.clear();
      showToast("👋 Logged out successfully!");
      setTimeout(() => {
        window.location.href = "https://mazharmecci.github.io/zamport/";
      }, 1000);
    });
  }
});
