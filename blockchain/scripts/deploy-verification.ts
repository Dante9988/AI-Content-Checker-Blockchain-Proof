import { ethers } from "hardhat";

async function main() {
  console.log("Deploying TruChain contracts...");
  const [deployer] = await ethers.getSigners();
  
  console.log(`Deployer address: ${deployer.address}`);
  console.log(`Deployer balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH`);

  // Step 1: Deploy TruChain
  console.log("\nDeploying TruChain...");
  
  // Initial supply: 1,000,0000 tokens
  const initialSupply = 1000000;
  
  const TruChain = await ethers.getContractFactory("TruChain");
  const truChain = await TruChain.deploy(initialSupply);

  await truChain.deployed();

  console.log(`TruChain token deployed to: ${truChain.address}`);
  console.log(`Initial supply: ${initialSupply} TRU`);
  
  // Step 2: Deploy ImageVerification
  console.log("\nDeploying ImageVerification contract...");

  // Default threshold: 5000 basis points (50%)
  // Images with a score below this threshold are considered real
  const minScoreThreshold = 5000;
  
  // Default verification price: 10 TRU tokens
  const verificationPrice = ethers.utils.parseEther("10");
  
  // Deploy the contract
  const ImageVerification = await ethers.getContractFactory("ImageVerification");
  const imageVerification = await ImageVerification.deploy(
    minScoreThreshold,
    truChain.address,
    verificationPrice
  );

  await imageVerification.deployed();

  console.log(`ImageVerification deployed to: ${imageVerification.address}`);
  console.log(`Verification price: ${ethers.utils.formatEther(verificationPrice)} TRU`);
  
  // Step 3: Set up the contracts
  
  // Approve the GPT-5 model
  const modelName = "gpt-5";
  const modelIdBase = `gpt-verification-${modelName}`;
  const modelIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(modelIdBase));
  
  console.log(`\nApproving model: ${modelName} with ID: ${modelIdHash}`);
  
  let tx = await imageVerification.approveModel(modelIdHash, modelName);
  await tx.wait();
  
  console.log("Model approved successfully");
  
  // Set the staking pool to the ImageVerification contract
  console.log("\nSetting staking pool to ImageVerification contract...");
  
  tx = await truChain.setStakingPool(imageVerification.address);
  await tx.wait();
  
  console.log("Staking pool set successfully");
  
  // Transfer some tokens to the deployer for testing
  const testAmount = ethers.utils.parseEther("1000");
  
  console.log("\nTransferring test tokens to deployer...");
  
  tx = await truChain.transfer(deployer.address, testAmount);
  await tx.wait();
  
  console.log(`Transferred ${ethers.utils.formatEther(testAmount)} TRU to deployer`);
  
  // Get network information
  const network = await ethers.provider.getNetwork();
  console.log("\nDeployment completed!");
  console.log(`\nTruChain Token: ${truChain.address}`);
  console.log(`ImageVerification: ${imageVerification.address}`);
  
  // Print verification commands
  console.log("\nVerification Commands:");
  console.log(`npx hardhat verify --network ${network.name} ${truChain.address} ${initialSupply}`);
  console.log(`npx hardhat verify --network ${network.name} ${imageVerification.address} ${minScoreThreshold} ${truChain.address} ${verificationPrice}`);
  
  console.log(`\nTo verify an image, users need to:`);
  console.log(`1. Approve the ImageVerification contract to spend their TRU tokens`);
  console.log(`2. Call storeVerificationWithPayment() with the image details`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
