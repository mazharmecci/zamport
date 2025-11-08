// === Constants ===
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec';

// === Order Card Creation ===

function createOrderCard(order) {
  const card = document.createElement("div");
  card.className = "order-card";
  card.style.opacity = "0";
  card.style.transition = "opacity 0.4s ease";

  const statusColor = order.status === "Order-Pending" ? "red" : "green";
  const badge = order.status === "Order-Dispatched"
    ? `<span class="status-badge">✔ Dispatched</span>`
    : "";

  card.innerHTML = `
    <h4>📦 SKU: ${order.sku}</h4>
    <p>🧪 Product: ${order.product}</p>
    <p>📌 Status: <span style="color:${statusColor}; font-weight:bold;">${order.status}</span> ${badge}</p>
    <p>📄 Sheet: ${order.sheetName}</p>
    <p>📅 Date: ${order.date || "N/A"}</p>
    <p>🔢 Total Labels: ${order.totalLabels || "N/A"}</p>
    <p>📦 Total Units: ${order.totalUnits || "N/A"}</p>
    ${order.labelLink ? `<p><a href="${order.labelLink}" target="_blank">🔗 Label Link</a></p>` : ""}
  `;
  return card;
}

// === Snappy Card Renderer ===

function renderPendingOrders(orders) {
  const container = document.getElementById("pendingOrdersContainer");
  if (!container) return;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const filtered = orders.filter(order => {
    const statusMatch = order.status?.trim().toLowerCase() === "order-pending";
    const dateObj = new Date(order.date);
    const monthMatch = dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear;
    return statusMatch && monthMatch;
  });

  container.innerHTML = filtered.length ? "" : "<p>No pending orders for this month.</p>";

  let delay = 0;
  filtered.forEach(order => {
    const card = createOrderCard(order);
    container.appendChild(card);
    setTimeout(() => (card.style.opacity = "1"), delay);
    delay += 100;
  });
}


// === Fetch Orders + Products ===
function fetchAndRenderOrders(product = "") {
  showLoadingOverlay(true);
  const url = product
    ? `${SCRIPT_URL}?mode=3pl-month&product=${encodeURIComponent(product)}`
    : `${SCRIPT_URL}?mode=3pl-month`;

  fetch(url)
    .then(res => res.json())
    .then(orders => {
      renderPendingOrders(orders);
      return fetch(`${SCRIPT_URL}?mode=products`);
    })
    .then(res => res.json())
    .then(products => populateProductDropdown(products))
    .catch(err => {
      console.error("Dashboard load failed:", err);
      showToast("❌ Failed to load dashboard data.");
    })
    .finally(() => showLoadingOverlay(false));
}

// === Dispatch SKU via POST
async function dispatchSKU(sku) {
  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ sku })
    });
    const text = await res.text();
    showToast(text.includes("successfully") ? `✅ ${text}` : `❌ ${text}`);
    return text;
  } catch (err) {
    console.error("Dispatch failed:", err);
    showToast("❌ Dispatch error");
    return "Dispatch error";
  }
}

// === Product Dropdown Population
function populateProductDropdown(products) {
  const dropdown = document.getElementById("productDropdown");
  if (!dropdown) return;
  dropdown.innerHTML = `<option value="">All Products</option>`;
  products.forEach(p => {
    const option = document.createElement("option");
    option.value = p;
    option.textContent = p;
    dropdown.appendChild(option);
  });
}

// === UI Bindings
document.getElementById("dispatchBtn").addEventListener("click", async () => {
  const sku = document.getElementById("skuInput").value.trim();
  if (!sku) return showToast("⚠️ Please enter a SKU");
  await dispatchSKU(sku);
  fetchAndRenderOrders(); // Refresh after dispatch
});

document.getElementById("productDropdown").addEventListener("change", (e) => {
  fetchAndRenderOrders(e.target.value);
});

window.addEventListener("DOMContentLoaded", () => {
  fetchAndRenderOrders();
});

// === Toast + Loading Overlay (assumed available)
function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.style.opacity = "1";
  setTimeout(() => (toast.style.opacity = "0"), 3000);
}

function showLoadingOverlay(show) {
  const overlay = document.getElementById("loadingOverlay");
  if (!overlay) return;
  overlay.style.display = show ? "flex" : "none";
}
