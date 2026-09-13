# EXPERIMENT 3: DEPLOYING AND INTERACTING WITH ERC-4626 VAULT CONTRACTS
## Complete Step-by-Step Lab Execution & Screenshot Guide (GitBountys Vault Use Case)

This guide walks you through running Experiment 3 on your local environment, demonstrating the standard ERC-4626 vault lifecycle for the **GitBountys Developer Bounty Vault**, verifying on-chain state changes, and capturing all required lab report screenshots.

---

## 1. Quick Start & Environment Setup

### Terminal 1: Start Hardhat Local Blockchain & Deploy Contracts
Open a terminal in `chain/` directory and execute:
```bash
cd chain
npx hardhat node
```
In a second terminal window (or tab), run the deployment script:
```bash
cd chain
npx hardhat run scripts/deploy.js --network localhost
```
> **Output to note**: Record contract addresses printed in the console:
> - `MockUSDC`: `0x9A676e781A523b5d0C0e43731313A708CB607508` (or newly deployed address)
> - `BountyVault`: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` (or newly deployed address)

### Terminal 2: Start Frontend Application
```bash
cd frontend
npm run dev
```
Open your browser at `http://localhost:5173/vault` (or `http://localhost:5174/vault`).

---

## 2. Step-by-Step Execution for Lab Screenshots

Follow these 16 steps directly inside the **GitBountys Developer Bounty Vault** UI (`/vault`). Take screenshots of each designated state:

### Step 1: Create Underlying ERC-20 Asset
- **Action**: Inspect `MockERC20.sol` (underlying bounty asset with controlled `mint()` function).
- **Screenshot 1**: Code snippet of `MockERC20.sol` or initial Vault Dashboard showing Underlying Asset = `Mock USDC (USDC)`.

### Step 2: Deploy ERC-20 Contract
- **Action**: Deployment completed via `npx hardhat run scripts/deploy.js --network localhost`.
- **Screenshot 2**: Hardhat terminal output showing `mockUSDC` deployment address saved in `chain/deployments/localhost.json`.

### Step 3: Mint Test Assets
- **Action**: On Tab 1 (**1. Mint & Approve**), click **Connect Wallet** (using Localhost Account #0: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`). Enter `1000` USDC and click **Mint 1000 MockUSDC**.
- **Screenshot 3**: UI showing updated `MockUSDC Balance: 1000 USDC` and transaction log entry `[Step 3] Mint MockUSDC`.

### Step 4: Create ERC-4626 Vault
- **Action**: Inspect `BountyVault.sol` which inherits `@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol`.
- **Screenshot 4**: Code snippet of `BountyVault.sol` constructor receiving `IERC20 asset_`.

### Step 5: Deploy the Vault
- **Action**: Deployed via `deploy.js` with `MockUSDC` address passed to constructor.
- **Screenshot 5**: Hardhat console output displaying `bountyVault` address.

### Step 6: Verify Underlying Asset & Initial State
- **Action**: View Vault Overview Metric Cards before deposit.
- **Screenshot 6**: Overview card showing `Total Vault Assets = 0 USDC`, `Total Vault Shares = 0 vUSDC`, `Exchange Rate = 1 vUSDC = 1.0000 USDC`.

### Step 7: Approve Vault Allowance
- **Action**: On Tab 1, enter `500` USDC in **Approve Vault Allowance** and click **Approve 500 USDC**.
- **Screenshot 7**: UI showing updated `Vault Allowance: 500 USDC` and log entry `[Step 7] Approve Vault`.

### Step 8 & 9: Preview & Deposit Assets
- **Action**: Switch to Tab 2 (**2. Deposit & Mint Shares**). Enter `100` USDC in **Deposit Assets**. Observe preview (~`100 vUSDC`). Click **Deposit 100 USDC**.
- **Screenshot 8**: Pre-deposit preview and successful deposit confirmation.

### Step 10: Verify Post-Deposit State
- **Action**: Inspect metrics bar after deposit.
- **Screenshot 9**:
  - `MockUSDC Balance`: Decreased by 100 (900 USDC remaining).
  - `Vault Share Balance`: Increased to 100 vUSDC.
  - `Total Vault Assets`: Increased to 100 USDC.
  - `Total Vault Shares`: Increased to 100 vUSDC.

### Step 11: Test Conversion Functions
- **Action**: Switch to Tab 5 (**5. Conversion Tools**).
  - Enter `100` in `convertToShares(assets)` -> Query -> Output = `100 vUSDC`.
  - Enter `100` in `convertToAssets(shares)` -> Query -> Output = `100 USDC`.
- **Screenshot 10**: Both conversion outputs displayed on screen.

### Step 12: Demonstrate mint()
- **Action**: Switch to Tab 2. Enter `50` in **Vault Shares to Mint (vUSDC)** and click **Mint 50 vUSDC**.
- **Screenshot 11**: Vault share balance increases by 50 (now 150 vUSDC) and USDC balance decreases accordingly.

### Step 13: Demonstrate withdraw()
- **Action**: Switch to Tab 3 (**3. Withdraw & Redeem**). Enter `30` USDC in **Withdraw Assets** and click **Withdraw 30 USDC**.
- **Screenshot 12**: USDC wallet balance increases by 30 USDC; vUSDC vault shares burned accordingly.

### Step 14: Demonstrate redeem()
- **Action**: On Tab 3, enter `40` vUSDC in **Redeem Shares** and click **Redeem 40 vUSDC**.
- **Screenshot 13**: 40 vUSDC burned; corresponding USDC underlying assets returned to wallet.

### Step 15: Observe Events
- **Action**: View **Experiment Activity & Event Log** at the bottom of the page.
- **Screenshot 14**: Clean event log list detailing `Mint`, `Approve`, `Deposit`, `Withdraw`, and `Redeem` transaction hashes.

### Step 16: Demonstrate Custom Application-Specific Feature (`harvestYield`)
- **Action**: Switch to Tab 4 (**4. Custom Yield Harvest**). Enter `200` USDC and click **Harvest & Inject 200 USDC Yield**.
- **Description**: Demonstrates GitBountys sponsor yield injection: sponsors deposit bonus pool rewards into the vault without issuing shares, appreciating `vUSDC` share value for all developer depositors.
- **Screenshot 15**:
  - `Total Yield Harvested`: Shows 200 USDC.
  - `Total Vault Assets`: Increases by 200 USDC without issuing shares.
  - `Vault Exchange Rate`: Appreciates (e.g. `1 vUSDC = 3.5000 USDC` depending on share supply).

---

## 3. Generating Word Report (`Defi Exp 3 Vaults.docx`)

Run the automated report generator script in Python:
```bash
python Lab/create_exp3_docx.py
```
This compiles a complete formatted lab submission document `Lab/Defi Exp 3 Vaults.docx` incorporating theory, Solidity source code, standards table, viva Q&A, and screenshot placeholders!
