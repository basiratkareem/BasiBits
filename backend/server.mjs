import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { Client, AccountId, PrivateKey, TransferTransaction, Hbar } from "@hashgraph/sdk";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = Client.forTestnet();
client.setOperator(
    AccountId.fromString(process.env.HEDERA_ACCOUNT_ID),
    PrivateKey.fromStringED25519(process.env.HEDERA_PRIVATE_KEY)
  );
  

// Test route
app.get("/", (req, res) => {
  res.send("BasiBits API running 🚀");
});

// Simulate a transaction
app.post("/send", async (req, res) => {
  const { toAccountId, amount } = req.body;

  try {
    const tx = await new TransferTransaction()
      .addHbarTransfer(process.env.HEDERA_ACCOUNT_ID, new Hbar(-amount))
      .addHbarTransfer(toAccountId, new Hbar(amount))
      .execute(client);

    const receipt = await tx.getReceipt(client);
    res.json({ status: "success", txId: tx.transactionId.toString(), receipt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT, () => console.log(`✅ BasiBits API running on port ${process.env.PORT}`));
