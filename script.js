// === Toast Notification Helper ===
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// === DOM Ready Handler ===

document.addEventListener("DOMContentLoaded", () => {
  // 🔐 Auth Check
  const isAuthenticated = sessionStorage.getItem("zamport-auth") === "true";
  if (!isAuthenticated) {
    window.location.href = "https://mazharmecci.github.io/zamport/";
    return;
  }

  // 👤 Display Logged-in User
  const usernameDisplay = document.getElementById("usernameDisplay");
  const userName = sessionStorage.getItem("zamport-user");
  if (usernameDisplay && userName) {
    usernameDisplay.textContent = userName;
  }

  // === Constants ===
  const API_URL = "https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec";

  // === DOM Elements ===
  const viewStatusBtn = document.getElementById("viewStatus");
  const productFilter = document.getElementById("productFilter");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const pendingOrdersContainer = document.getElementById("pendingOrdersContainer");

  // === Global Variables ===
  let pendingOrders = [];

  // ✅ Attach Event Listener Safely
  if (viewStatusBtn) {
    viewStatusBtn.addEventListener("click", () => {
      // your logic here
    });
  } else {
    console.warn("viewStatus button not found in DOM");
  }

  // === UI Helpers ===
  function toggleSpinner(button, show) {
    const spinner = button.querySelector(".spinner");
    if (spinner) spinner.classList.toggle("hidden", !show);
  }

  function showLoadingOverlay(show) {
    loadingOverlay.classList.toggle("hidden", !show);
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  function populateProductDropdown(products) {
    productFilter.innerHTML = `<option value="">All Products</option>`;
    products.forEach(product => {
      const option = document.createElement("option");
      option.value = product;
      option.textContent = product;
      productFilter.appendChild(option);
    });
  }

  function createOrderCard(order) {
    const card = document.createElement("div");
    card.className = "order-card";

    const statusColor = order.status === "Order-Pending" ? "red" : "green";

    card.innerHTML = `
      <h4>📦 SKU: ${order.sku}</h4>
      <p>🧪 Product: ${order.product}</p>
      <p>📌 Status: <span style="color:${statusColor}; font-weight:bold;">${order.status}</span></p>
      <p>📄 Sheet: ${order.sheetName}</p>
      <p>📅 Date: ${order.date || "N/A"}</p>
      <p>🔢 Total Labels: ${order.totalLabels || "N/A"}</p>
      <p>📦 Total Units: ${order.totalUnits || "N/A"}</p>
      ${order.labelLink ? `<p><a href="${order.labelLink}" target="_blank">🔗 Label Link</a></p>` : ""}
    `;
    return card;
  }
});


  function renderPendingOrders(orders) {
    pendingOrdersContainer.innerHTML = "";
    if (!orders.length) {
      pendingOrdersContainer.innerHTML = "<p>No pending orders found.</p>";
      return;
    }
    orders.forEach(order => {
      pendingOrdersContainer.appendChild(createOrderCard(order));
    });
  }

  function fetchAndRenderOrders(product = "") {
    showLoadingOverlay(true);
    const url = product
      ? `${API_URL}?mode=3pl-month&product=${encodeURIComponent(product)}`
      : `${API_URL}?mode=3pl-month`;

    fetch(url)
      .then(res => res.json())
      .then(orders => renderPendingOrders(orders))
      .catch(err => {
        console.error("Failed to fetch orders:", err);
        showToast("❌ Failed to load orders.");
      })
      .finally(() => showLoadingOverlay(false));
  }

  // === 🔘 Pending Orders Button Click ===
  viewStatusBtn.addEventListener("click", () => {
    toggleSpinner(viewStatusBtn, true);

    fetch(`${API_URL}?mode=products`)
      .then(res => res.json())
      .then(products => {
        populateProductDropdown(products);
        fetchAndRenderOrders(); // Load all pending orders
      })
      .catch(err => {
        console.error("Failed to load products:", err);
        showToast("❌ Failed to load product list.");
      })
      .finally(() => toggleSpinner(viewStatusBtn, false));
  });

  // === 🔄 Filter by Product ===
  productFilter.addEventListener("change", () => {
    const selectedProduct = productFilter.value;
    fetchAndRenderOrders(selectedProduct);
  });
});

// === 🔄 Refresh orders ===
document.getElementById("refreshOrdersBtn").addEventListener("click", () => {
  fetchAndRenderOrders(productFilter?.value || "");
});
