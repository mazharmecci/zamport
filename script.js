// === Constants ===

document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "https://script.google.com/macros/s/AKfycbwoThlNNF7dSuIM5ciGP0HILQ9PsCtuUnezgzh-0CMgpTdZeZPdqymHiOGMK_LL5txy7A/exec"; // Replace with actual deployment URL

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
        <h4>SKU: ${order.sku}</h4>
        <p>Product: ${order.product}</p>
        <p>Status: ${order.status}</p>
        ${order.labelLink ? `<a href="${order.labelLink}" target="_blank">📦 Label</a>` : ""}
        <button class="dispatch-btn" data-sku="${order.sku}">🚚 Mark as Dispatched</button>
      `;
      pendingOrdersContainer.appendChild(card);
    });

    // Attach dispatch handlers
    document.querySelectorAll(".dispatch-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const sku = btn.dataset.sku;
        btn.disabled = true;
        btn.textContent = "⏳ Dispatching...";
        dispatchOrder(sku, btn);
      });
    });
  }

  function dispatchOrder(sku, btn) {
    const formData = new FormData();
    formData.append("sku", sku);

    fetch(API_URL, {
      method: "POST",
      body: formData,
    })
      .then(res => res.json())
      .then(data => {
        btn.textContent = "✅ Dispatched";
        if (data.labelLink) {
          const label = document.createElement("a");
          label.href = data.labelLink;
          label.target = "_blank";
          label.textContent = "📦 Label";
          btn.insertAdjacentElement("afterend", label);
        }
      })
      .catch(err => {
        console.error("Dispatch failed:", err);
        btn.textContent = "❌ Failed";
        btn.disabled = false;
      });
  }
});
