# Local Blockchain Setup

This localnet powers real on-chain bounty flows:
- repository URL stored on-chain
- issue URL + bounty amount stored on-chain
- claim transfers funds to the developer wallet

## 1. Install and run local node

```bash
cd chain
npm install
npm run node
```

Keep this terminal running.

## 2. Deploy contract

In a second terminal:

```bash
cd chain
npm run compile
npm run deploy:local
```

Copy the deployed contract address.

## 3. Configure backend

In `backend/.env` set:

```env
BLOCKCHAIN_ENABLED=true
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=<one private key from hardhat node accounts>
BOUNTY_BOARD_ADDRESS=<deployed contract address>
FORCE_PAYOUT_WALLET=true
PAYOUT_WALLET_PRIVATE_KEY=<hardhat account private key or any funded wallet private key>
```

Use Hardhat account #1 for the permanent receiver. The app will derive the wallet address automatically.

## 4. Run app

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

## Notes
- Bounty creation now sends native ETH (localnet ETH) on-chain as escrow.
- Claim bounty triggers an on-chain transfer to the contributor address entered in the UI.
- For production/testnet, replace `RPC_URL`, `PRIVATE_KEY`, and contract address.
