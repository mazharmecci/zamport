document.getElementById('viewStatus').addEventListener('click', () => {
  // TODO: Fetch from Google Apps Script backend
  // Filter for Order-Pending and render cards
  console.log('View Pending Orders clicked');
});

document.getElementById('scanBox').addEventListener('click', () => {
  const qr = new Html5Qrcode("qr-reader");
  qr.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    (decodedText) => {
      document.getElementById('skuInput').value = decodedText;
      qr.stop();
    },
    (errorMessage) => {
      console.warn(errorMessage);
    }
  );
});

document.getElementById('submitSku').addEventListener('click', () => {
  const sku = document.getElementById('skuInput').value.trim();
  if (!sku) return alert("Enter or scan a SKU first");

  // TODO: Send SKU to backend and update status
  console.log('Submitting SKU:', sku);
});
