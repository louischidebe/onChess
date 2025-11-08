const hre = require("hardhat");

async function main() {
  console.log("Deploying OnChess contract...");
  
  const OnChess = await hre.ethers.getContractFactory("OnChess");
  const onChess = await OnChess.deploy();
  
  await onChess.waitForDeployment();
  
  const address = await onChess.getAddress();
  console.log(`OnChess deployed to: ${address}`);
  
  // Get deployer info
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployed by: ${deployer.address}`);
  console.log(`Network: ${hre.network.name}`);
  
  // Set dev fee on Base mainnet
  if (hre.network.config.chainId === 8453) {
    console.log("\nSetting dev fee to 0.000009 ETH...");
    const devFee = hre.ethers.parseEther("0.000009");
    const tx = await onChess.setDevFee(devFee);
    await tx.wait();
    console.log("✅ Dev fee set to 0.000009 ETH per move");
  }
  
  // Save deployment info to frontend
  const fs = require('fs');
  const path = require('path');
  
  const deploymentInfo = {
    address: address,
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };
  
  const frontendDir = path.join(__dirname, '..', 'frontend', 'src');
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(frontendDir, 'contract-address.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n✅ Deployment info saved to frontend/src/contract-address.json");
  
  if (hre.network.config.chainId === 8453) {
    console.log("\n🎉 Base Mainnet Deployment Complete!");
    console.log(`\nContract: ${address}`);
    console.log(`Dev Fee: 0.000009 ETH per move`);
    console.log(`\nNext steps:`);
    console.log("1. Update frontend/.env:");
    console.log(`   VITE_CONTRACT_ADDRESS=${address}`);
    console.log("   VITE_CHAIN_ID=8453");
    console.log("   VITE_RPC_URL=https://mainnet.base.org");
    console.log("2. Build frontend: cd frontend && npm run build");
    console.log("3. Deploy frontend/dist to your hosting (Vercel/Netlify)");
    console.log("4. Update farcaster.json with your domain");
  } else {
    console.log("\nNext steps:");
    console.log("1. Update frontend/.env with the contract address");
    console.log("2. Start the frontend: cd frontend && npm run dev");
    console.log("3. Connect two wallets to test PvP gameplay");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
