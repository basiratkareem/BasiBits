# BasiBits — Payment App (Hedera Testnet)
Simple checkout dApp built with HTML/CSS/JS (frontend) and Node.js + Hedera
SDK (backend).

## App Link
[VIEW APP](https://basiratkareem.github.io/BasiBits/public/index.html)


## Features
- Create a simple checkout invoice (client calls backend)
- Shows merchant Hedera account, invoice ID, amount and QR code
- Buyer pays on Hedera Testnet (wallet / transfer with memo)
- Backend verifies incoming transfer to merchant account matching invoice
memo.

## Requirements
- Node.js 18+ and npm
- A Hedera Testnet account and private key (merchant account / operator)

## Environment variables (.env)
- OPERATOR_ID — Hedera merchant account ID (e.g. 0.0.x)
- OPERATOR_KEY — private key (merchant) (do NOT commit this)
- MERCHANT_ACCOUNT_ID — same as OPERATOR_ID (or a receiving account you
control)
- PORT — optional (default 3000)

## Install & run
```bash
npm install
# create .env with the variables above
npm run dev
# open http://localhost:3000
