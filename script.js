// === Global State ===
let currentOrders = [];

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

// === Card Renderer with Dispatch Button ===

function createDispatchableOrderCard(order) {
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
    ${order.imageUrl ? `<img src="${order.imageUrl}" alt="Product Image" class="product-image" />` : ""}
  `;

  if (order.status === "Order-Pending") {
    const dispatchBtn = document.createElement("button");
    dispatchBtn.textContent = "Mark as Dispatched";
    dispatchBtn.className = "dispatch-btn";
    dispatchBtn.onclick = () => markOrderAsDispatched(order, dispatchBtn);
    card.appendChild(dispatchBtn);
  }

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

  orders.forEach((order, index) => {
    const card = createDispatchableOrderCard(order);
    card.style.animationDelay = `${index * 80}ms`;
    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

// === Fetch Orders ===

function fetchAndRenderOrders(product = "") {
  showLoadingOverlay(true);
  showToast("⏳ Fetching your orders...");

  const API_URL = "https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec";
  const url = product
    ? `${API_URL}?mode=3pl-month&product=${encodeURIComponent(product)}`
    : `${API_URL}?mode=3pl-month`;

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
    .finally(() => {
      showLoadingOverlay(false);
    });
}


function markOrderAsDispatched(order, dispatchBtn) {
  showToast("🔄 Updating status...");

  const API_URL = "https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec";
  const payload = {
    sku: order.sku,
    sheetId: order.sheetId,
    sheetName: order.sheetName,
    rowIndex: order.rowIndex,
    newStatus: "Order-Dispatched"
  };

  // ✅ Disable button immediately
  dispatchBtn.disabled = true;
  dispatchBtn.textContent = "Dispatching...";
  dispatchBtn.style.opacity = "0.7";
  dispatchBtn.style.cursor = "not-allowed";

  fetch(API_URL, {
    method: "POST",
    body: new URLSearchParams(payload)
  })
    .then(res => res.json())
    .then(data => {
      showToast("✅ Order marked as dispatched!");

      const updated = currentOrders.find(o =>
        o.sku === order.sku &&
        o.sheetId === order.sheetId &&
        o.sheetName === order.sheetName &&
        o.rowIndex === order.rowIndex
      );
      if (updated) updated.status = "Order-Dispatched";

      // ✅ Update button to show tick and keep it disabled
      dispatchBtn.textContent = "✅ Dispatched";
      dispatchBtn.style.backgroundColor = "#28a745";
      dispatchBtn.style.opacity = "1";
      dispatchBtn.style.cursor = "default";
      dispatchBtn.style.boxShadow = "none";
    })
    .catch(err => {
      console.error("Dispatch failed:", err);
      showToast("❌ Failed to update order.");

      // Re-enable button if dispatch fails
      dispatchBtn.disabled = false;
      dispatchBtn.textContent = "Mark as Dispatched";
      dispatchBtn.style.opacity = "1";
      dispatchBtn.style.cursor = "pointer";
    });
}





// === DOM Ready Handler ===
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
  if (usernameDisplay && userName) {
    usernameDisplay.textContent = userName;
  }

  fetch(`${API_URL}?mode=products`)
    .then(res => res.json())
    .then(products => {
      populateProductDropdown(products);
    })
    .catch(err => {
      console.error("Product fetch failed:", err);
      showToast("❌ Failed to load product list.");
    })
    .finally(() => {
      fetchAndRenderOrders();
    });

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

  const productFilter = document.getElementById("productFilter");
  if (productFilter) {
    productFilter.addEventListener("change", () => {
      fetchAndRenderOrders(productFilter.value);
    });
  }

  const refreshOrdersBtn = document.getElementById("refreshOrdersBtn");
  if (refreshOrdersBtn) {
    refreshOrdersBtn.addEventListener("click", () => {
      fetchAndRenderOrders(productFilter?.value || "");
    });
  }

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
