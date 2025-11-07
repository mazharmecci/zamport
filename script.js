document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.clear();
      showToast("👋 Logged out successfully!");
      setTimeout(() => {
        window.location.href = "https://mazharmecci.github.io/zamport/";
      }, 1000);
    });
  }

  const isAuthenticated = sessionStorage.getItem("zamport-auth") === "true";
  if (!isAuthenticated) {
    window.location.href = "https://mazharmecci.github.io/zamport/";
    return;
  }
});

const usernameDisplay = document.getElementById("usernameDisplay");
const userName = sessionStorage.getItem("zamport-user");

if (usernameDisplay && userName) {
  usernameDisplay.textContent = userName;
}

  // === Constants ===
  const API_URL = "https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec";

  const productFilter = document.getElementById("productFilter");
  const reloadBtn = document.getElementById("reloadProductsBtn");
  const pendingOrdersContainer = document.getElementById("pendingOrdersContainer");
  const loadingOverlay = document.getElementById("loadingOverlay");

  // 🔄 Reload product list
  reloadBtn.addEventListener("click", () => {
    toggleSpinner(reloadBtn, true);
    fetch(`${API_URL}?mode=products`)
      .then(res => res.json())
      .then(products => populateProductDropdown(products))
      .catch(err => console.error("Failed to load products:", err))
      .finally(() => toggleSpinner(reloadBtn, false));
  });

  // 🔍 Filter pending orders
  productFilter.addEventListener("change", () => {
    const selectedProduct = productFilter.value;
    showLoadingOverlay(true);
    const url = selectedProduct
      ? `${API_URL}?product=${encodeURIComponent(selectedProduct)}`
      : API_URL;

    fetch(url)
      .then(res => res.json())
      .then(orders => renderPendingOrders(orders))
      .catch(err => console.error("Failed to fetch orders:", err))
      .finally(() => showLoadingOverlay(false));
  });

  // 🌀 Initial load
  reloadBtn.click();

  // === UI Helpers ===
  function toggleSpinner(button, show) {
    button.querySelector(".spinner").classList.toggle("hidden", !show);
  }

  function showLoadingOverlay(show) {
    loadingOverlay.classList.toggle("hidden", !show);
  }

  function populateProductDropdown(products) {
    productFilter.innerHTML = `<option value="">All Products</option>`;
    products.forEach(product => {
      const option = document.createElement("option");
      option.value = product;
      option.textContent = product;
      productFilter.appendChild(option);
    });
    productFilter.dispatchEvent(new Event("change")); // Trigger initial load
  }

  function renderPendingOrders(orders) {
    pendingOrdersContainer.innerHTML = "";

    if (!orders.length) {
      pendingOrdersContainer.innerHTML = "<p>No pending orders found.</p>";
      return;
    }

    orders.forEach(order => {
      const card = document.createElement("div");
      card.className = "order-card";

      card.innerHTML = `
        <h4>📦 SKU: ${order.sku}</h4>
        <p>🧪 Product: ${order.product}</p>
        <p>📌 Status: ${order.status}</p>
        <p>📄 Sheet: ${order.sheetName}</p>
        <p>📅 Date: ${order.date || "N/A"}</p>
        <p>🔢 Total Labels: ${order.totalLabels || "N/A"}</p>
        <p>📦 Total Units: ${order.totalUnits || "N/A"}</p>
        ${order.labelLink ? `<p><a href="${order.labelLink}" target="_blank">🔗 Label Link</a></p>` : ""}
      `;

      pendingOrdersContainer.appendChild(card);
    });
  }
});
