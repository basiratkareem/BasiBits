require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { Client, Hbar, AccountId, TransferTransaction } = require('@hashgraph/sdk');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const OPERATOR_ID = process.env.OPERATOR_ID; // e.g. 0.0.12345
const OPERATOR_KEY = process.env.OPERATOR_KEY; // private key

if (!OPERATOR_ID || !OPERATOR_KEY) {
  console.error('❌ OPERATOR_ID and OPERATOR_KEY must be set in .env');
  process.exit(1);
}

// Initialize Hedera client
const client = Client.forTestnet().setOperator(OPERATOR_ID, OPERATOR_KEY);

// Simple in-memory invoice store
const invoices = {}; // { invoiceId: { amount, merchant, currency, paid, tx } }

// Validate Hedera Account ID format
function isValidHederaId(id) {
  return /^0\.0\.\d+$/.test(id);
}

// 🧾 Create Invoice
app.post('/api/create-invoice', async (req, res) => {
  try {
    const { amount, merchantId } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!merchantId || !isValidHederaId(merchantId)) {
      return res.status(400).json({ error: 'Invalid merchant Hedera account ID' });
    }

    try {
      AccountId.fromString(merchantId);
    } catch {
      return res.status(400).json({ error: 'Malformed merchant account ID' });
    }

    const invoiceId = uuidv4();
    invoices[invoiceId] = {
      id: invoiceId,
      amount: Number(amount),
      currency: 'HBAR',
      merchant: merchantId,
      paid: false,
      createdAt: Date.now(),
    };

    return res.json({
      invoiceId,
      amount: invoices[invoiceId].amount,
      merchant: merchantId,
      message: 'Invoice created successfully',
    });
  } catch (err) {
    console.error('Error creating invoice:', err.message);
    return res.status(500).json({ error: 'Server error creating invoice' });
  }
});

// 💳 Pay Invoice
app.post('/api/pay-invoice/:id', async (req, res) => {
  const id = req.params.id;
  const invoice = invoices[id];

  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.paid) return res.status(400).json({ error: 'Invoice already paid' });

  try {
    // Convert IDs and amount properly
    const senderId = AccountId.fromString(OPERATOR_ID);
    const receiverId = AccountId.fromString(invoice.merchant);
    const amountHbar = new Hbar(invoice.amount);

    // Create transfer transaction with memo
    let transaction = new TransferTransaction()
      .addHbarTransfer(senderId, amountHbar.negated())
      .addHbarTransfer(receiverId, amountHbar)
      .setTransactionMemo(`InvoiceID:${invoice.id}`);

    // Freeze before executing
    transaction = await transaction.freezeWith(client);

    // Execute (auto-signed by client)
    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);
    const txId = txResponse.transactionId.toString();
    const hashscanUrl = `https://hashscan.io/testnet/transaction/${txId}`;

    // Mark invoice as paid
    invoice.paid = true;
    invoice.tx = { id: txId, status: receipt.status.toString(), hashscanUrl };

    return res.json({
      success: true,
      message: 'Invoice paid successfully',
      txId,
      hashscanUrl,
      status: receipt.status.toString(),
    });
  } catch (err) {
    console.error('Payment error:', err);
    return res.status(500).json({ error: err.message || 'Payment failed' });
  }
});

// 💳 Check Invoice Payment via Mirror Node
app.get('/api/check-invoice/:id', async (req, res) => {
  const id = req.params.id;
  const invoice = invoices[id];
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  if (invoice.paid) return res.json({ paid: true, tx: invoice.tx });

  try {
    const mirrorBase = 'https://testnet.mirrornode.hedera.com/api/v1/transactions';
    const resp = await axios.get(`${mirrorBase}?account.id=${invoice.merchant}&limit=50`);
    const transactions = resp.data.transactions || [];

    for (const tx of transactions) {
      const memo = tx.memo_base64
        ? Buffer.from(tx.memo_base64, 'base64').toString('utf8')
        : tx.memo || '';

      if (memo.includes(id)) {
        invoice.paid = true;
        invoice.tx = tx;
        return res.json({ paid: true, tx });
      }
    }

    return res.json({ paid: false });
  } catch (err) {
    console.error('Mirror node check error:', err.message);
    return res.status(500).json({ error: 'Error checking transactions' });
  }
});

// 🩺 Health endpoint
app.get('/api/health', (req, res) => res.json({ ok: true }));

// 🚀 Start server
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));