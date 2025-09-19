const { ethers } = require('ethers');
require('dotenv').config();

// Contract ABIs - load from contract artifacts
const verificationABI = require('./packages/contracts/artifacts/contracts/ImageVerification.sol/ImageVerification.json').abi;
const tokenABI = require('./packages/contracts/artifacts/contracts/TruChain.sol/TruChain.json').abi;

async function main() {
  try {
  // Initialize provider and wallet
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'https://rpc.cc3-testnet.creditcoin.network';
  const privateKey = process.env.PRIVATE_KEY;
    
    if (!privateKey) {
      throw new Error('PRIVATE_KEY not set in environment variables');
    }
    
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const address = await wallet.getAddress();
    
    console.log(`Using wallet: ${address}`);
    
    // Contract addresses
    const verificationContractAddress = process.env.IMAGE_VERIFICATION_ADDRESS;
    const tokenContractAddress = process.env.TRUCHAIN_ADDRESS;
    
    if (!verificationContractAddress) {
      throw new Error('IMAGE_VERIFICATION_ADDRESS not set in environment variables');
    }
    
    if (!tokenContractAddress) {
      throw new Error('TRUCHAIN_ADDRESS not set in environment variables');
    }
    
    console.log(`Verification contract: ${verificationContractAddress}`);
    console.log(`Token contract: ${tokenContractAddress}`);
    
    // Initialize contracts
    const verificationContract = new ethers.Contract(
      verificationContractAddress,
      verificationABI,
      wallet
    );
    
    const tokenContract = new ethers.Contract(
      tokenContractAddress,
      tokenABI,
      wallet
    );
    
    // Check if we're the owner of the verification contract
    const owner = await verificationContract.owner();
    const isOwner = owner.toLowerCase() === address.toLowerCase();
    console.log(`Contract owner: ${owner}`);
    console.log(`Are we the owner? ${isOwner}`);
    
    // Check if we're an authorized verifier
    const isVerifier = await verificationContract.authorizedVerifiers(address);
    console.log(`Are we an authorized verifier? ${isVerifier}`);
    
    // If not a verifier and we're the owner, add ourselves
    if (!isVerifier && isOwner) {
      console.log('Adding ourselves as a verifier...');
      const tx = await verificationContract.addVerifier(address, {
        gasLimit: 200000,
        gasPrice: ethers.utils.parseUnits('50', 'gwei')
      });
      const receipt = await tx.wait();
      console.log(`Transaction successful: ${receipt.transactionHash}`);
      console.log('Now we are an authorized verifier');
    } else if (!isVerifier) {
      console.log('WARNING: Not an authorized verifier and not the owner. Cannot fix this issue.');
    }
    
    // Check if the GPT-4o model is approved
    const modelId = ethers.utils.id('gpt-4o');
    console.log(`Model ID for gpt-4o: ${modelId}`);
    
    const modelInfo = await verificationContract.approvedModels(modelId);
    const isModelApproved = modelInfo.approved;
    console.log(`Is the model approved? ${isModelApproved}`);
    
    // If model is not approved and we're the owner, approve it
    if (!isModelApproved && isOwner) {
      console.log('Approving the model...');
      const tx = await verificationContract.approveModel(modelId, 'gpt-4o', {
        gasLimit: 500000,
        gasPrice: ethers.utils.parseUnits('50', 'gwei')
      });
      const receipt = await tx.wait();
      console.log(`Transaction successful: ${receipt.transactionHash}`);
      console.log('Now the model is approved');
    } else if (!isModelApproved) {
      console.log('WARNING: Model is not approved and we are not the owner. Cannot fix this issue.');
    }
    
    // Check token balance
    const balance = await tokenContract.balanceOf(address);
    console.log(`Token balance: ${ethers.utils.formatUnits(balance, 18)}`);
    
    // Check verification price
    const verificationPrice = await verificationContract.verificationPrice();
    console.log(`Verification price: ${ethers.utils.formatUnits(verificationPrice, 18)}`);
    
    // Check if we have enough tokens
    const hasEnoughTokens = balance.gte(verificationPrice);
    console.log(`Do we have enough tokens? ${hasEnoughTokens}`);
    
    // If we don't have enough tokens and we're the token owner, mint some
    const tokenOwner = await tokenContract.owner();
    const isTokenOwner = tokenOwner.toLowerCase() === address.toLowerCase();
    console.log(`Token owner: ${tokenOwner}`);
    console.log(`Are we the token owner? ${isTokenOwner}`);
    
    if (!hasEnoughTokens && isTokenOwner) {
      console.log('Minting tokens to ourselves...');
      const mintAmount = ethers.utils.parseUnits('100', 18); // 100 tokens
      const tx = await tokenContract.mint(address, mintAmount, {
        gasLimit: 200000,
        gasPrice: ethers.utils.parseUnits('50', 'gwei')
      });
      const receipt = await tx.wait();
      console.log(`Transaction successful: ${receipt.transactionHash}`);
      
      const newBalance = await tokenContract.balanceOf(address);
      console.log(`New token balance: ${ethers.utils.formatUnits(newBalance, 18)}`);
    } else if (!hasEnoughTokens) {
      console.log('WARNING: Not enough tokens and not the token owner. Cannot fix this issue.');
    }
    
    // Check token allowance
    const allowance = await tokenContract.allowance(address, verificationContractAddress);
    console.log(`Token allowance: ${ethers.utils.formatUnits(allowance, 18)}`);
    
    // Check if we have enough allowance
    const hasEnoughAllowance = allowance.gte(verificationPrice);
    console.log(`Do we have enough allowance? ${hasEnoughAllowance}`);
    
    // If we don't have enough allowance, approve the contract to spend our tokens
    if (!hasEnoughAllowance) {
      console.log('Approving tokens for the verification contract...');
      const approveAmount = verificationPrice.mul(2); // Approve double the price to avoid future approvals
      const tx = await tokenContract.approve(verificationContractAddress, approveAmount, {
        gasLimit: 200000,
        gasPrice: ethers.utils.parseUnits('50', 'gwei')
      });
      const receipt = await tx.wait();
      console.log(`Transaction successful: ${receipt.transactionHash}`);
      
      const newAllowance = await tokenContract.allowance(address, verificationContractAddress);
      console.log(`New token allowance: ${ethers.utils.formatUnits(newAllowance, 18)}`);
    }
    
    console.log('\nSummary:');
    console.log('========');
    console.log(`1. Verifier status: ${isVerifier ? 'Authorized' : 'Not authorized'}`);
    console.log(`2. Model approval: ${isModelApproved ? 'Approved' : 'Not approved'}`);
    console.log(`3. Token balance: ${ethers.utils.formatUnits(balance, 18)} (required: ${ethers.utils.formatUnits(verificationPrice, 18)})`);
    console.log(`4. Token allowance: ${ethers.utils.formatUnits(allowance, 18)} (required: ${ethers.utils.formatUnits(verificationPrice, 18)})`);
    
    if (isVerifier && isModelApproved && hasEnoughTokens && hasEnoughAllowance) {
      console.log('\nAll checks passed! The contract should work now.');
    } else {
      console.log('\nSome issues remain. Please fix them before trying again.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
