// client.js
const createBtn = document.getElementById('create');
const amountEl = document.getElementById('amount');
const merchantInput = document.getElementById('merchantId'); // new input field
const invoiceArea = document.getElementById('invoiceArea');
const invoiceIdEl = document.getElementById('invoiceId');
const merchantEl = document.getElementById('merchant');
const amtEl = document.getElementById('amt');
const checkBtn = document.getElementById('check');
const statusEl = document.getElementById('status');

//Helper function to validate Hedera Account ID (e.g. 0.0.717)
function isValidHederaId(id) {
  return /^0\.0\.\d+$/.test(id);
}

// Create invoice
createBtn.addEventListener('click', async () => {
  const amount = parseFloat(amountEl.value);
  const merchantId = merchantInput.value.trim();

  if (!amount || amount <= 0) {
    alert('Please enter a valid amount.');
    return;
  }

  if (!isValidHederaId(merchantId)) {
    alert('Please enter a valid Hedera merchant account ID (e.g. 0.0.717).');
    return;
  }

  try {
    const res = await fetch('/api/create-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, merchantId })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    // Show invoice info
    invoiceIdEl.textContent = data.invoiceId;
    merchantEl.textContent = data.merchant;
    amtEl.textContent = data.amount.toFixed(3);
    invoiceArea.classList.remove('hidden');

    // Generate QR code
    generateQRCode(data.merchant, data.amount, data.invoiceId);
    statusEl.textContent = '';
  } catch (err) {
    alert('Error creating invoice: ' + err.message);
  }
});

// Check invoice payment
checkBtn.addEventListener('click', async () => {
  const id = invoiceIdEl.textContent.trim();
  if (!id) return alert('No invoice to check.');

  statusEl.textContent = 'Checking payment...';
  statusEl.style.color = '#94a3b8'; // neutral

  try {
    const res = await fetch(`/api/check-invoice/${id}`);
    const data = await res.json();

    if (data.paid) {
      statusEl.textContent = `Payment received! TX: ${data.tx.transaction_id || ''}`;
      statusEl.style.color = '#4ade80'; // green
    } else {
      statusEl.textContent = 'Not paid yet. Try again in a few seconds.';
      statusEl.style.color = '#fbbf24'; // yellow
    }
  } catch (err) {
    statusEl.textContent = 'Error checking payment.';
    statusEl.style.color = '#ef4444'; // red
  }
});

// Generate QR Code for Hedera payment
function generateQRCode(merchant, amount, memo) {
  const canvas = document.getElementById('qrcode');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const text = `hedera:${merchant}?amount=${amount}&memo=${memo}`;

  if (!window.QRCode) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
    script.onload = () => {
      QRCode.toCanvas(canvas, text, { width: 200 }, (err) => {
        if (err) console.error(err);
      });
    };
    document.body.appendChild(script);
  } else {
    QRCode.toCanvas(canvas, text, { width: 200 }, (err) => {
      if (err) console.error(err);
    });
  }
}
