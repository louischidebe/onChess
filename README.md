# OnChess ♔

**Fully on-chain 1v1 chess miniapp for Farcaster on Base**

Every move is a transaction. Every game is forever on-chain.

---

## 🎯 Features

- **Fully On-Chain**: Every chess move is recorded on Base as a transaction
- **Farcaster Miniapp**: Integrated with Farcaster's v0 miniapp framework
- **Real-time Sync**: Event-driven updates keep both players in sync
- **Smart Wallet Ready**: Uses Coinbase Smart Wallet via `miniapp-wagmi-connector`
- **Developer Fees**: Configurable per-move fee system for monetization
- **Minimal Trust**: Contract enforces turn order; chess.js validates legality client-side
- **Beautiful UI**: Base-themed with Lexend font, colorful and playful design

---

## 🏗️ Architecture

### Smart Contract (`OnChess.sol`)
- Stores minimal authoritative game state: FEN, players, turn, active flag
- Enforces turn order and collects optional dev fees
- Emits events for all moves and game state changes
- Owner-controlled fee configuration and withdrawal (reentrancy protected)

### Frontend (React + Vite)
- Uses `chess.js` for move validation and FEN generation
- `react-chessboard` for interactive board UI
- `wagmi` + `miniapp-wagmi-connector` for Farcaster wallet integration
- Real-time event subscriptions for opponent moves
- Lexend typography and Base color palette

---

## 📋 Prerequisites

- Node.js 18+ and npm
- A wallet with Base testnet ETH (for deployment)
- WalletConnect Project ID (optional, for production)

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install root dependencies (Hardhat)
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Local Development (PvP Testing)

#### Start Hardhat Node
```bash
npm run node
```

This starts a local Ethereum node on `http://127.0.0.1:8545` with 20 pre-funded accounts.

#### Deploy Contract (in a new terminal)
```bash
npm run deploy:local
```

This deploys `OnChess.sol` to localhost and saves the contract address to `frontend/src/contract-address.json`.

#### Run Tests (optional)
```bash
npm test
```

#### Setup Local Testing Environment (optional but recommended)
```bash
npm run setup:local
```

This creates 3 test games and sets a small dev fee for realistic testing.

#### Run Simulation (optional)
```bash
npm run simulate
```

Executes a full game sequence (Scholar's Mate) to verify contract functionality.

#### Start Frontend
```bash
npm run dev
```

The app will run at `http://localhost:3000`.

---

### 3. Local PvP Setup (Two Players)

To test multiplayer locally:

1. **Import Hardhat accounts into browsers**:
   - Hardhat generates 20 test accounts. Check the terminal where you ran `npx hardhat node` to see private keys.
   - Import two different private keys:
     - **Browser 1** (or Profile 1): Import account #0 private key into MetaMask/Coinbase Wallet
     - **Browser 2** (or Profile 2): Import account #1 private key into MetaMask/Coinbase Wallet

2. **Connect to local network**:
   - Add a custom network in your wallet:
     - **Network Name**: Localhost
     - **RPC URL**: `http://127.0.0.1:8545`
     - **Chain ID**: `31337`
     - **Currency Symbol**: `ETH`

3. **Open frontend in both browsers**:
   - Browser 1: Navigate to `http://localhost:3000` and connect wallet (account #0)
   - Browser 2: Navigate to `http://localhost:3000` and connect wallet (account #1)

4. **Create and play a game**:
   - In Browser 1, click "Generate Join Code" and share the displayed 6-character code
   - In Browser 2, click "Join Game" and enter the code
   - Take turns making moves. Each move is a transaction on your local chain!

---

## 🌐 Deploy to Base Testnet (Sepolia)

### 1. Setup Environment

Create a `.env` file in the root directory:

```bash
PRIVATE_KEY=your_private_key_here
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

**⚠️ SECURITY WARNING**: 
- **NEVER commit your private key to Git**
- Use a fresh wallet for testing
- Transfer only small amounts of testnet ETH

### 2. Get Base Sepolia ETH

Get testnet ETH from:
- [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
- [Superchain Faucet](https://app.optimism.io/faucet)

### 3. Deploy

```bash
npm run deploy:base
```

The contract address will be saved to `frontend/src/contract-address.json`.

### 4. Update Frontend Config

Edit `frontend/.env`:

```bash
VITE_CONTRACT_ADDRESS=your_deployed_contract_address
VITE_CHAIN_ID=84532
VITE_RPC_URL=https://sepolia.base.org
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

Get a WalletConnect Project ID at [cloud.walletconnect.com](https://cloud.walletconnect.com).

### 5. Build and Deploy Frontend

```bash
cd frontend
npm run build
```

Deploy the `frontend/dist` folder to:
- Vercel
- Netlify
- IPFS
- Any static hosting

---

## 🔔 Farcaster Notifications (Neynar)

To send miniapp notifications for FID challenges:

1. Get a Neynar API key at https://docs.neynar.com/
2. Set it in `frontend/.env`:
   ```bash
   VITE_NEYNAR_API_KEY=your_neynar_api_key
   ```
3. Use the "Challenge by FID" input to send a notification to the recipient's FID.
4. The miniapp opens with `?gameId=<id>` in the URL; the app will auto-join that game using the connected wallet.

Example target URL: `https://your-domain.com/?gameId=123&code=AB12XY`

## 📱 Farcaster Miniapp Configuration

### 1. Update `farcaster.json`

Before publishing, update the manifest:

```json
{
  "accountAssociation": {
    "header": "base64_encoded_header",
    "payload": "base64_encoded_payload",
    "signature": "signature_hex"
  },
  "frame": {
    "version": "1",
    "name": "OnChess",
    "iconUrl": "https://your-domain.com/icon.png",
    "splashImageUrl": "https://your-domain.com/splash.png",
    "splashBackgroundColor": "#0052FF",
    "homeUrl": "https://your-domain.com",
    "webhookUrl": "https://your-domain.com/api/webhook"
  },
  "embed": {
    "width": 100,
    "height": 100
  }
}
```

**Required steps**:
1. Host your frontend on a public URL
2. Create icon and splash images
3. Generate account association signature (see [Farcaster docs](https://miniapps.farcaster.xyz/))
4. Update all URLs to your domain

### 2. Embedding Metadata

The frontend `index.html` already includes required meta tags:

```html
<meta property="fc:frame" content="vNext" />
<meta property="fc:frame:image" content="..." />
```

Update these URLs to match your deployment.

### 3. Publishing

Follow the [Farcaster miniapp publishing guide](https://miniapps.farcaster.xyz/) to submit your app.

---

## 🎮 How to Play

1. **Connect Wallet**: Use Farcaster Wallet (Coinbase Smart Wallet) or MetaMask
2. **Create Game**: Click "Generate Join Code" and share it with your opponent
3. **Join by Code**: Click "Join Game" and enter the code
4. **Challenge by FID**: Enter opponent's Farcaster FID and click "Challenge" to send a Neynar notification
5. **Make Moves**: Click a piece, then click the destination square
6. **Wait for Opponent**: Moves are submitted as transactions; wait for confirmation
7. **Resign**: Use the "Resign" button to forfeit
8. **Developer Fee**: If enabled, each move requires a small ETH payment

---

## 💰 Developer Fee System

### How It Works

- The contract owner can set a per-move fee in wei (`setDevFee`)
- Players pay this fee when calling `makeMove`
- Fees accumulate in the contract
- Owner can withdraw fees via `withdrawDeveloperFees` (reentrancy protected)

### Setting the Fee

```javascript
// Example: Set 0.001 ETH per move
await onChess.setDevFee(ethers.parseEther("0.001"))
```

### Admin Functions

Only the contract owner (deployer) can:
- `setDevFee(uint256 feeWei)` - Update per-move fee
- `withdrawDeveloperFees()` - Withdraw accumulated fees
- `terminateGame(uint256 gameId)` - Emergency game termination

---

## 🔒 Security Notes

### Smart Contract
- **Reentrancy Protection**: Uses OpenZeppelin's `ReentrancyGuard` on `withdrawDeveloperFees`
- **Access Control**: Owner-only functions use `Ownable`
- **Minimal Trust**: Contract doesn't validate chess rules, only turn order and basic checks
- **Transparent Fees**: Dev fee is public and immutable per transaction

### Frontend
- Never exposes private keys
- All transactions require user signature
- Event-driven updates prevent stale state

### Best Practices
1. **Audit before mainnet**: Get a professional audit for production
2. **Test thoroughly**: Use local network and testnet extensively
3. **Fresh wallet for deploy**: Don't reuse wallets with significant funds
4. **Monitor gas**: Base is cheap, but complex games can add up
5. **Fee transparency**: Clearly communicate dev fees to users

---

## 📁 Project Structure

```
OnChess/
├── contracts/
│   └── OnChess.sol              # Main chess contract
├── scripts/
│   ├── deploy.js                # Deployment script
│   └── simulate.js              # Game simulation script
├── test/
│   └── chess.test.js            # Contract tests
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx       # Wallet connection header
│   │   │   ├── GameList.jsx     # Game list & selection
│   │   │   ├── CreateGame.jsx   # Game creation form
│   │   │   └── GameBoard.jsx    # Chess board & game logic
│   │   ├── config/
│   │   │   ├── wagmi.js         # Wagmi configuration
│   │   │   └── abi.js           # Contract ABI
│   │   ├── App.jsx              # Main app component
│   │   ├── index.css            # Base styles & theme
│   │   └── contract-address.json # Deployed contract address
│   ├── index.html               # HTML with Farcaster metadata
│   ├── package.json
│   └── vite.config.js
├── farcaster.json               # Farcaster miniapp manifest
├── hardhat.config.js            # Hardhat configuration
├── package.json                 # Root package.json
└── README.md                    # This file
```

---

## 🛠️ Development Commands

| Command | Description |
|---------|-------------|
| `npm run node` | Start Hardhat local node |
| `npm run deploy:local` | Deploy to localhost |
| `npm run deploy:base` | Deploy to Base Sepolia |
| `npm test` | Run contract tests |
| `npm run simulate` | Simulate a full game |
| `npm run setup:local` | Setup test games & dev fee |
| `npm run leaderboard` | Generate leaderboard CSV |
| `npm run dev` | Start frontend dev server |
| `npm run build` | Build frontend for production |

---

## 🎨 UI/UX Design

### Theme
- **Font**: Lexend (Google Fonts)
- **Colors**: Base official palette
  - Primary: `#0052FF` (Base Blue)
  - Dark: `#0041CC`
  - Light: `#4285FF`
  - Background: `#0A0B0D` (dark theme)
- **Style**: Bubbly, colorful, playful with subtle animations
- **Responsive**: Mobile-first, works on all screen sizes

### Key Features
- Animated move highlights
- Glow effects on interactive elements
- Real-time turn indicators
- Transaction status feedback
- Promotion piece selection dialog

---

## 📚 Additional Resources

- [Farcaster Miniapps Docs](https://miniapps.farcaster.xyz/)
- [Base Mini-App Quickstart](https://docs.base.org/mini-apps/quickstart/migrate-existing-apps)
- [Wagmi Documentation](https://wagmi.sh/)
- [chess.js Documentation](https://github.com/jhlywa/chess.js)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

---

## 🐛 Troubleshooting

### Local Development Issues

**Frontend can't connect to contract:**
- Ensure Hardhat node is running
- Check that contract was deployed (`contract-address.json` exists)
- Verify wallet is connected to localhost network (Chain ID 31337)
- Refresh the page after connecting wallet

**Transaction fails:**
- Check you have enough ETH (local accounts start with 10,000 ETH)
- Ensure it's your turn
- Verify dev fee is included if set

**Wallet won't connect:**
- Add localhost network manually to MetaMask/Coinbase Wallet
- Import a Hardhat account private key
- Clear browser cache and reconnect

### Production Issues

**Contract deployment fails:**
- Verify you have Base Sepolia ETH
- Check RPC URL is correct in `.env`
- Ensure private key is valid and has no extra spaces

**Frontend can't read contract:**
- Verify `contract-address.json` has correct address
- Check `.env` has correct chain ID and RPC URL
- Ensure contract is deployed on the same network

---

## 🤝 Contributing

Contributions welcome! This is a demonstration project showing how to build a Farcaster miniapp on Base.

Potential improvements:
- Add move timer/clock
- ELO rating system (requires backend)
- Game invitations via Farcaster casts
- Draw offers and acceptance
- Game history browser
- Puzzle mode

---

## ⚖️ License

MIT License - feel free to use this as a template for your own projects!

---

## 🎉 Credits

Built with:
- [Hardhat](https://hardhat.org/) - Ethereum development environment
- [Wagmi](https://wagmi.sh/) - React hooks for Ethereum
- [chess.js](https://github.com/jhlywa/chess.js) - Chess logic
- [react-chessboard](https://github.com/Clariity/react-chessboard) - Chess UI
- [Vite](https://vitejs.dev/) - Frontend build tool
- [OpenZeppelin](https://openzeppelin.com/) - Secure smart contract library
- [Base](https://base.org/) - L2 blockchain
- [Farcaster](https://www.farcaster.xyz/) - Decentralized social protocol

---

**Happy chess playing! ♔♕♖♗♘♙**
