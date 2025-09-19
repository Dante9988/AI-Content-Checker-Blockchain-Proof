import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("TruChain Token", function () {
  let truChainToken: Contract;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let stakingPool: SignerWithAddress;
  
  // Test data
  const initialSupply = 1000000;
  const transferAmount = ethers.utils.parseEther("100");
  const paymentAmount = ethers.utils.parseEther("10");

  beforeEach(async function () {
    // Get signers
    [owner, user, stakingPool] = await ethers.getSigners();
    
    // Deploy contract
    const VeriToken = await ethers.getContractFactory("TruChain");
    truChainToken = await VeriToken.deploy(initialSupply);
    await truChainToken.deployed();
    
    // Transfer some tokens to the user
    await truChainToken.transfer(user.address, transferAmount);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await truChainToken.owner()).to.equal(owner.address);
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await truChainToken.balanceOf(owner.address);
      const totalSupply = await truChainToken.totalSupply();
      expect(totalSupply.sub(transferAmount)).to.equal(ownerBalance);
    });
    
    it("Should have correct name and symbol", async function () {
      expect(await truChainToken.name()).to.equal("TruChain");
      expect(await truChainToken.symbol()).to.equal("TRU");
    });
  });
  
  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      const userBalanceBefore = await truChainToken.balanceOf(user.address);
      
      // Transfer tokens from user to owner
      await truChainToken.connect(user).transfer(owner.address, ethers.utils.parseEther("50"));
      
      const userBalanceAfter = await truChainToken.balanceOf(user.address);
      expect(userBalanceBefore.sub(userBalanceAfter)).to.equal(ethers.utils.parseEther("50"));
    });
    
    it("Should fail if sender doesn't have enough tokens", async function () {
      const userBalance = await truChainToken.balanceOf(user.address);
      
      // Try to send more tokens than the user has
      await expect(
        truChainToken.connect(user).transfer(owner.address, userBalance.add(1))
      ).to.be.reverted;
    });
  });
  
  describe("Payment Processing", function () {
    beforeEach(async function () {
      // Set staking pool
      await truChainToken.setStakingPool(stakingPool.address);
    });
    
    it("Should set staking pool correctly", async function () {
      expect(await truChainToken.stakingPool()).to.equal(stakingPool.address);
    });
    
    it("Should process payment correctly", async function () {
      // Approve the owner to spend user's tokens
      await truChainToken.connect(user).approve(owner.address, paymentAmount);
      
      // Process payment
      await truChainToken.connect(owner).processPayment(user.address, paymentAmount);
      
      // Check balances
      const userBalance = await truChainToken.balanceOf(user.address);
      const stakingPoolBalance = await truChainToken.balanceOf(stakingPool.address);
      
      // User should have lost the payment amount
      expect(userBalance).to.equal(transferAmount.sub(paymentAmount));
      
      // Staking pool should have received 50% of the payment
      expect(stakingPoolBalance).to.equal(paymentAmount.div(2));
      
      // 50% should have been burned (check total supply)
      const totalSupply = await truChainToken.totalSupply();
      expect(totalSupply).to.equal(ethers.utils.parseEther(initialSupply.toString()).sub(paymentAmount.div(2)));
    });
    
    it("Should fail if user has insufficient balance", async function () {
      const tooMuch = transferAmount.mul(2);
      
      // Approve the owner to spend user's tokens
      await truChainToken.connect(user).approve(owner.address, tooMuch);
      
      // Try to process payment
      await expect(
        truChainToken.connect(owner).processPayment(user.address, tooMuch)
      ).to.be.reverted;
    });
    
    it("Should fail if caller is not authorized", async function () {
      // Approve the owner to spend user's tokens
      await truChainToken.connect(user).approve(owner.address, paymentAmount);
      
      // Try to process payment from unauthorized account
      await expect(
        truChainToken.connect(user).processPayment(user.address, paymentAmount)
      ).to.be.revertedWith("TruChain: caller is not authorized");
    });
    
    it("Should allow changing burn percentage", async function () {
      // Change burn percentage to 75%
      await truChainToken.setBurnPercentage(75);
      expect(await truChainToken.burnPercentage()).to.equal(75);
      
      // Approve the owner to spend user's tokens
      await truChainToken.connect(user).approve(owner.address, paymentAmount);
      
      // Process payment
      await truChainToken.connect(owner).processPayment(user.address, paymentAmount);
      
      // Staking pool should have received 25% of the payment
      const stakingPoolBalance = await truChainToken.balanceOf(stakingPool.address);
      expect(stakingPoolBalance).to.equal(paymentAmount.mul(25).div(100));
      
      // 75% should have been burned
      const totalSupply = await truChainToken.totalSupply();
      expect(totalSupply).to.equal(ethers.utils.parseEther(initialSupply.toString()).sub(paymentAmount.mul(75).div(100)));
    });
  });
  
  describe("Owner Functions", function () {
    it("Should allow owner to mint new tokens", async function () {
      const mintAmount = ethers.utils.parseEther("1000");
      const totalSupplyBefore = await truChainToken.totalSupply();
      
      await truChainToken.mint(user.address, mintAmount);
      
      const userBalance = await truChainToken.balanceOf(user.address);
      const totalSupplyAfter = await truChainToken.totalSupply();
      
      expect(userBalance).to.equal(transferAmount.add(mintAmount));
      expect(totalSupplyAfter).to.equal(totalSupplyBefore.add(mintAmount));
    });
    
    it("Should not allow non-owner to mint tokens", async function () {
      const mintAmount = ethers.utils.parseEther("1000");
      
      await expect(
        truChainToken.connect(user).mint(user.address, mintAmount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("Should not allow setting invalid staking pool", async function () {
      await expect(
        truChainToken.setStakingPool(ethers.constants.AddressZero)
      ).to.be.revertedWith("TruChain: staking pool cannot be the zero address");
    });
    
    it("Should not allow setting invalid burn percentage", async function () {
      await expect(
        truChainToken.setBurnPercentage(101)
      ).to.be.revertedWith("TruChain: burn percentage cannot exceed 100");
    });
  });
});
