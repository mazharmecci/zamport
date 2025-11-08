// === Toast Notification ===
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
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
  const dropdown = document.getElementById("productFilter");
  if (!dropdown) return;
  dropdown.innerHTML = `<option value="">All Products</option>`;
  products.forEach(p => {
    const option = document.createElement("option");
    option.value = p;
    option.textContent = p;
    dropdown.appendChild(option);
  });
  dropdown.classList.add("animate");
  setTimeout(() => dropdown.classList.remove("animate"), 500);
}

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
  container.innerHTML = orders.length ? "" : "<p>No pending orders found.</p>";

  let delay = 0;
  orders.forEach(order => {
    const card = createOrderCard(order);
    container.appendChild(card);
    setTimeout(() => (card.style.opacity = "1"), delay);
    delay += 100;
  });
}

// === Fetch Orders + Products ===
function fetchAndRenderOrders(product = "") {
  showLoadingOverlay(true);
  const API = "https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec";
  const url = product ? `${API}?mode=3pl-month&product=${encodeURIComponent(product)}` : `${API}?mode=3pl-month`;

  fetch(url)
    .then(res => res.json())
    .then(orders => {
      renderPendingOrders(orders);
      return fetch(`${API}?mode=products`);
    })
    .then(res => res.json())
    .then(products => populateProductDropdown(products))
    .catch(err => {
      console.error("Dashboard load failed:", err);
      showToast("❌ Failed to load dashboard data.");
    })
    .finally(() => showLoadingOverlay(false));
}

// === Dispatch SKU Handler ===
function dispatchSKU() {
  const sku = document.getElementById("skuInput")?.value?.trim();
  if (!sku) return showToast("⚠️ Please enter a valid SKU.");

  showLoadingOverlay(true);
  const API = "https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec";

  fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "dispatch-sku", sku })
  })
    .then(res => res.json())
    .then(response => {
      if (response.success) {
        showToast(`✅ SKU ${sku} marked as dispatched.`);
        document.getElementById("skuInput").value = "";
        fetchAndRenderOrders();
      } else {
        showToast(`❌ ${response.message || "SKU not found or already dispatched."}`);
      }
    })
    .catch(err => {
      console.error("Dispatch error:", err);
      showToast("❌ Failed to update order status.");
    })
    .finally(() => showLoadingOverlay(false));
}

// === DOM Ready ===
document.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem("zamport-auth") !== "true") {
    window.location.href = "https://mazharmecci.github.io/zamport/";
    return;
  }

  const usernameDisplay = document.getElementById("usernameDisplay");
  const userName = sessionStorage.getItem("zamport-user");
  if (usernameDisplay && userName) usernameDisplay.textContent = userName;

  showLoadingOverlay(false);
  fetchAndRenderOrders();

  document.getElementById("submitSku")?.addEventListener("click", dispatchSKU);
  document.getElementById("productFilter")?.addEventListener("change", e => {
    fetchAndRenderOrders(e.target.value);
  });

  document.getElementById("refreshOrdersBtn")?.addEventListener("click", () => {
    fetchAndRenderOrders(document.getElementById("productFilter")?.value || "");
  });

  document.getElementById("viewStatus")?.addEventListener("click", () => {
    const btn = document.getElementById("viewStatus");
    toggleSpinner(btn, true);
    const API = "https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec";

    fetch(`${API}?mode=products`)
      .then(res => res.json())
      .then(products => {
        populateProductDropdown(products);
        fetchAndRenderOrders();
      })
      .catch(err => {
        console.error("Product load failed:", err);
        showToast("❌ Failed to load product list.");
      })
      .finally(() => toggleSpinner(btn, false));
  });

  document.getElementById("logoutBtn")?.addEventListener("click", e => {
    e.preventDefault();
    sessionStorage.clear();
    showToast("👋 Logged out successfully!");
    setTimeout(() => {
      window.location.href = "https://mazharmecci.github.io/zamport/";
    }, 1000);
  });
});
