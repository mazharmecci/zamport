// === Toast Notification Helper ===
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

// === UI Helpers ===
function toggleSpinner(button, show) {
  const spinner = button?.querySelector(".spinner");
  if (spinner) {
    spinner.classList.toggle("hidden", !show);
  }
}

function showLoadingOverlay(show) {
  const loadingOverlay = document.getElementById("loadingOverlay");
  if (loadingOverlay) {
    loadingOverlay.classList.toggle("hidden", !show);
  }
}

function populateProductDropdown(products = []) {
  const productFilter = document.getElementById("productFilter");
  if (!productFilter) return;

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

function renderPendingOrders(orders) {
  const pendingOrdersContainer = document.getElementById("pendingOrdersContainer");
  if (!pendingOrdersContainer) return;

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
  const API_URL = "https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec";
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

// === DOM Ready Handler ===
document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec";

  // === Auth Check ===
  if (sessionStorage.getItem("zamport-auth") !== "true") {
    window.location.href = "https://mazharmecci.github.io/zamport/";
    return;
  }

  // ✅ Show login success toast
  showToast("✅ Login successful!");

  // === Display Logged-in User ===
  const usernameDisplay = document.getElementById("usernameDisplay");
  const userName = sessionStorage.getItem("zamport-user");
  if (usernameDisplay && userName) {
    usernameDisplay.textContent = userName;
  }

  // === Initial Load Spinner + Toast ===
  showLoadingOverlay(true);
  showToast("⏳ Loading your orders...");

  // === Fetch Products + Orders Immediately ===
  fetch(`${API_URL}?mode=products`)
    .then(res => res.json())
    .then(products => {
      populateProductDropdown(products);
      fetchAndRenderOrders(); // fetch all orders
    })
    .catch(err => {
      console.error("Initial load failed:", err);
      showToast("❌ Failed to load product list.");
    })
    .finally(() => {
      showLoadingOverlay(false);
    });

  // === View Status Button ===
  const viewStatusBtn = document.getElementById("viewStatus");
  if (viewStatusBtn) {
    viewStatusBtn.addEventListener("click", () => {
      toggleSpinner(viewStatusBtn, true);
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
        .finally(() => toggleSpinner(viewStatusBtn, false));
    });
  }

  // === Product Filter Change ===
  const productFilter = document.getElementById("productFilter");
  if (productFilter) {
    productFilter.addEventListener("change", () => {
      fetchAndRenderOrders(productFilter.value);
    });
  }

  // === Refresh Orders Button ===
  const refreshOrdersBtn = document.getElementById("refreshOrdersBtn");
  if (refreshOrdersBtn) {
    refreshOrdersBtn.addEventListener("click", () => {
      fetchAndRenderOrders(productFilter?.value || "");
    });
  }

  function triggerCardMatchWorkflow() {
  const firstCard = document.querySelector(".order-card");
  if (!firstCard) {
    showToast("⚠️ No pending orders to match.");
    return;
  }

  const extract = (selector) => firstCard.querySelector(selector)?.textContent?.split(": ")[1]?.trim() || "";

  const payload = {
    sku: extract("h4"),
    product: extract("p:nth-of-type(1)"),
    status: extract("p:nth-of-type(2)"),
    sheetName: extract("p:nth-of-type(3)"),
    date: extract("p:nth-of-type(4)"),
  };

  console.log("🔍 Matching card details:", payload);

  const API_URL = "https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec";
  const url = `${API_URL}?mode=match-card&sku=${encodeURIComponent(payload.sku)}&product=${encodeURIComponent(payload.product)}&sheet=${encodeURIComponent(payload.sheetName)}&date=${encodeURIComponent(payload.date)}`;

  showToast("🔍 Matching card to sheet...");
  showLoadingOverlay(true);

  fetch(url)
    .then(res => res.json())
    .then(data => {
      console.log("✅ Matched rows:", data);
      showToast(`✅ Found ${data.length} matching row(s).`);
      // You can now use `data` to trigger status update or audit logic
    })
    .catch(err => {
      console.error("❌ Match workflow failed:", err);
      showToast("❌ Failed to match card to sheet.");
    })
    .finally(() => showLoadingOverlay(false));
}

  .then(products => {
  populateProductDropdown(products);
  fetchAndRenderOrders();
})
.finally(() => {
  showLoadingOverlay(false);
  setTimeout(triggerCardMatchWorkflow, 500); // slight delay to ensure DOM is ready
});

  
  // === Logout Button ===
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (event) => {
      event.preventDefault();
      sessionStorage.clear();
      showToast("👋 Logged out successfully!");
      setTimeout(() => {
        window.location.href = "https://mazharmecci.github.io/zamport/";
      }, 1000);
    });
  }
});
