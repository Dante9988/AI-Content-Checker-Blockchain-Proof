import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("ImageVerification", function () {
  let imageVerification: Contract;
  let truChain: Contract;
  let owner: SignerWithAddress;
  let verifier: SignerWithAddress;
  let user: SignerWithAddress;
  
  // Test data
  const minScoreThreshold = 5000; // 50%
  const modelName = "gpt-5";
  const modelIdBase = `gpt-verification-${modelName}`;
  let modelId: string;
  
  const contentHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  const scoreBps = 7500; // 75% - likely AI-generated
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Payment related
  const initialSupply = 1000000;
  const verificationPrice = ethers.utils.parseEther("10"); // 10 TRU tokens
  const userTokens = ethers.utils.parseEther("100"); // 100 TRU tokens

  beforeEach(async function () {
    // Get signers
    [owner, verifier, user] = await ethers.getSigners();
    
    // Deploy TruChain
    const TruChain = await ethers.getContractFactory("TruChain");
    truChain = await TruChain.deploy(initialSupply);
    await truChain.deployed();
    
    // Transfer some tokens to the user
    await truChain.transfer(user.address, userTokens);
    
    // Deploy ImageVerification
    const ImageVerification = await ethers.getContractFactory("ImageVerification");
    imageVerification = await ImageVerification.deploy(
      minScoreThreshold,
      truChain.address,
      verificationPrice
    );
    await imageVerification.deployed();
    
    // Set up staking pool
    await truChain.setStakingPool(imageVerification.address);
    
    // Calculate model ID hash
    modelId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(modelIdBase));
    
    // Approve model
    await imageVerification.approveModel(modelId, modelName);
    
    // Add verifier
    await imageVerification.addVerifier(verifier.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await imageVerification.owner()).to.equal(owner.address);
    });

    it("Should set the correct min score threshold", async function () {
      expect(await imageVerification.minScoreThreshold()).to.equal(minScoreThreshold);
    });
    
    it("Should authorize owner as verifier", async function () {
      expect(await imageVerification.authorizedVerifiers(owner.address)).to.equal(true);
    });
    
    it("Should set the correct TruChain address", async function () {
      expect(await imageVerification.truChain()).to.equal(truChain.address);
    });
    
    it("Should set the correct verification price", async function () {
      expect(await imageVerification.verificationPrice()).to.equal(verificationPrice);
    });
  });
  
  describe("Model management", function () {
    it("Should approve a model correctly", async function () {
      const model = await imageVerification.approvedModels(modelId);
      expect(model.name).to.equal(modelName);
      expect(model.approved).to.equal(true);
    });
    
    it("Should list approved models", async function () {
      const models = await imageVerification.getApprovedModels();
      expect(models.length).to.equal(1);
      expect(models[0].name).to.equal(modelName);
    });
  });
  
  describe("Verifier management", function () {
    it("Should add a verifier correctly", async function () {
      expect(await imageVerification.authorizedVerifiers(verifier.address)).to.equal(true);
    });
    
    it("Should remove a verifier correctly", async function () {
      await imageVerification.removeVerifier(verifier.address);
      expect(await imageVerification.authorizedVerifiers(verifier.address)).to.equal(false);
    });
    
    it("Should not allow non-owners to add verifiers", async function () {
      await expect(
        imageVerification.connect(user).addVerifier(user.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
  
  describe("Verification", function () {
    it("Should store verification result correctly", async function () {
      await imageVerification.connect(verifier).storeVerification(
        contentHash,
        modelId,
        scoreBps,
        timestamp
      );
      
      const result = await imageVerification.getVerification(contentHash);
      expect(result.contentHash).to.equal(contentHash);
      expect(result.modelId).to.equal(modelId);
      expect(result.scoreBps).to.equal(scoreBps);
      expect(result.verified).to.equal(false); // Score is above threshold, so should be marked as fake
      expect(result.timestamp).to.equal(timestamp);
      expect(result.verifier).to.equal(verifier.address);
    });
    
    it("Should emit ImageVerified event", async function () {
      await expect(
        imageVerification.connect(verifier).storeVerification(
          contentHash,
          modelId,
          scoreBps,
          timestamp
        )
      )
        .to.emit(imageVerification, "ImageVerified")
        .withArgs(contentHash, modelId, scoreBps, false, timestamp);
    });
    
    it("Should not allow non-verifiers to store verification", async function () {
      await expect(
        imageVerification.connect(user).storeVerification(
          contentHash,
          modelId,
          scoreBps,
          timestamp
        )
      ).to.be.revertedWith("Caller is not an authorized verifier");
    });
    
    it("Should not allow verification with unapproved model", async function () {
      const unapprovedModelId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("unapproved-model"));
      
      await expect(
        imageVerification.connect(verifier).storeVerification(
          contentHash,
          unapprovedModelId,
          scoreBps,
          timestamp
        )
      ).to.be.revertedWith("Model not approved");
    });
    
    it("Should correctly identify real images", async function () {
      const realImageScore = 2500; // 25% - likely real
      
      await imageVerification.connect(verifier).storeVerification(
        "0x2222222222222222222222222222222222222222222222222222222222222222",
        modelId,
        realImageScore,
        timestamp
      );
      
      const isVerified = await imageVerification.isImageVerified("0x2222222222222222222222222222222222222222222222222222222222222222");
      expect(isVerified).to.equal(true);
    });
    
    it("Should correctly identify fake images", async function () {
      await imageVerification.connect(verifier).storeVerification(
        contentHash,
        modelId,
        scoreBps,
        timestamp
      );
      
      const isVerified = await imageVerification.isImageVerified(contentHash);
      expect(isVerified).to.equal(false);
    });
    
    it("Should not allow duplicate verifications", async function () {
      await imageVerification.connect(verifier).storeVerification(
        contentHash,
        modelId,
        scoreBps,
        timestamp
      );
      
      await expect(
        imageVerification.connect(verifier).storeVerification(
          contentHash,
          modelId,
          scoreBps,
          timestamp
        )
      ).to.be.revertedWith("Image already verified");
    });
  });
  
  describe("Paid Verification", function () {
    const paidContentHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    
    it("Should allow users to pay for verification", async function () {
      // Approve tokens for the contract to spend
      await truChain.connect(user).approve(imageVerification.address, verificationPrice);
      
      // Store verification with payment
      await imageVerification.connect(user).storeVerificationWithPayment(
        paidContentHash,
        modelId,
        scoreBps,
        timestamp
      );
      
      // Check verification was stored
      const result = await imageVerification.getVerification(paidContentHash);
      expect(result.contentHash).to.equal(paidContentHash);
      expect(result.modelId).to.equal(modelId);
      expect(result.scoreBps).to.equal(scoreBps);
      expect(result.verified).to.equal(false); // Score is above threshold, so should be marked as fake
      expect(result.timestamp).to.equal(timestamp);
      expect(result.verifier).to.equal(imageVerification.address); // Contract is the verifier
      
      // Check user's token balance was reduced
      const userBalance = await truChain.balanceOf(user.address);
      expect(userBalance).to.equal(userTokens.sub(verificationPrice));
    });
    
    it("Should emit PaymentProcessed event", async function () {
      // Approve tokens for the contract to spend
      await truChain.connect(user).approve(imageVerification.address, verificationPrice);
      
      // Store verification with payment
      await expect(
        imageVerification.connect(user).storeVerificationWithPayment(
          paidContentHash,
          modelId,
          scoreBps,
          timestamp
        )
      )
        .to.emit(imageVerification, "PaymentProcessed")
        .withArgs(user.address, verificationPrice);
    });
    
    it("Should fail if user has insufficient token balance", async function () {
      // Create a user with no tokens
      const poorUser = (await ethers.getSigners())[3];
      
      // Try to store verification with payment
      await expect(
        imageVerification.connect(poorUser).storeVerificationWithPayment(
          paidContentHash,
          modelId,
          scoreBps,
          timestamp
        )
      ).to.be.revertedWith("Insufficient token balance");
    });
    
    it("Should fail if user has not approved tokens", async function () {
      // Try to store verification without approving tokens
      await expect(
        imageVerification.connect(user).storeVerificationWithPayment(
          paidContentHash,
          modelId,
          scoreBps,
          timestamp
        )
      ).to.be.revertedWith("TruChain: insufficient allowance");
    });
    
    it("Should allow owner to change verification price", async function () {
      const newPrice = ethers.utils.parseEther("20");
      
      await imageVerification.setVerificationPrice(newPrice);
      
      expect(await imageVerification.verificationPrice()).to.equal(newPrice);
      
      // Approve tokens for the contract to spend
      await truChain.connect(user).approve(imageVerification.address, newPrice);
      
      // Store verification with new price
      await imageVerification.connect(user).storeVerificationWithPayment(
        paidContentHash,
        modelId,
        scoreBps,
        timestamp
      );
      
      // Check user's token balance was reduced by the new price
      const userBalance = await truChain.balanceOf(user.address);
      expect(userBalance).to.equal(userTokens.sub(newPrice));
    });
  });
  
  describe("Threshold management", function () {
    it("Should allow owner to change threshold", async function () {
      const newThreshold = 6000;
      await imageVerification.setMinScoreThreshold(newThreshold);
      expect(await imageVerification.minScoreThreshold()).to.equal(newThreshold);
    });
    
    it("Should not allow non-owners to change threshold", async function () {
      await expect(
        imageVerification.connect(user).setMinScoreThreshold(6000)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
