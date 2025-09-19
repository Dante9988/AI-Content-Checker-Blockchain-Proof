// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./TruChain.sol";

/**
 * @title ImageVerification
 * @dev Smart contract for storing image verification results from GPT-5 analysis
 * Uses TruChain for payment
 */
contract ImageVerification is Ownable {
    // Events
    event ImageVerified(bytes32 indexed contentHash, bytes32 indexed modelId, uint256 scoreBps, bool verified, uint256 timestamp);
    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);
    event ModelApproved(bytes32 indexed modelId, string modelName);
    event VerificationPriceUpdated(uint256 newPrice);
    event PaymentProcessed(address indexed user, uint256 amount);

    // Structs
    struct VerificationResult {
        bytes32 contentHash;      // Hash of the image content
        bytes32 modelId;          // ID of the model used for verification
        uint256 scoreBps;         // Score in basis points (0-10000), higher means more likely to be AI-generated
        bool verified;            // Final verification result (true = real, false = fake)
        uint256 timestamp;        // Timestamp when verification was performed
        address verifier;         // Address of the verifier
    }

    struct Model {
        bytes32 id;               // Model ID (hash)
        string name;              // Model name (e.g., "gpt-5")
        bool approved;            // Whether the model is approved for verification
    }

    // State variables
    mapping(bytes32 => VerificationResult) public verifications;
    mapping(address => bool) public authorizedVerifiers;
    mapping(bytes32 => Model) public approvedModels;
    bytes32[] public modelIds;
    uint256 public verificationCount;
    uint256 public minScoreThreshold;  // Threshold in basis points (0-10000)
    
    // Payment related variables
    TruChain public truChain;
    uint256 public verificationPrice;  // Price in TRU tokens (with decimals)

    // Constructor
    constructor(uint256 _minScoreThreshold, address _truChainAddress, uint256 _verificationPrice) {
        minScoreThreshold = _minScoreThreshold;
        authorizedVerifiers[msg.sender] = true;
        
        // Initialize payment variables
        truChain = TruChain(_truChainAddress);
        verificationPrice = _verificationPrice;
    }

    // Modifiers
    modifier onlyVerifier() {
        require(authorizedVerifiers[msg.sender], "Caller is not an authorized verifier");
        _;
    }

    // Admin functions
    function addVerifier(address verifier) external onlyOwner {
        require(verifier != address(0), "Invalid verifier address");
        require(!authorizedVerifiers[verifier], "Verifier already authorized");
        
        authorizedVerifiers[verifier] = true;
        emit VerifierAdded(verifier);
    }

    function removeVerifier(address verifier) external onlyOwner {
        require(verifier != address(0), "Invalid verifier address");
        require(authorizedVerifiers[verifier], "Verifier not authorized");
        require(verifier != owner(), "Cannot remove owner as verifier");
        
        authorizedVerifiers[verifier] = false;
        emit VerifierRemoved(verifier);
    }

    function approveModel(bytes32 modelId, string calldata modelName) external onlyOwner {
        require(modelId != bytes32(0), "Invalid model ID");
        require(bytes(modelName).length > 0, "Model name cannot be empty");
        
        if (!approvedModels[modelId].approved) {
            modelIds.push(modelId);
        }
        
        approvedModels[modelId] = Model({
            id: modelId,
            name: modelName,
            approved: true
        });
        
        emit ModelApproved(modelId, modelName);
    }

    function setMinScoreThreshold(uint256 _minScoreThreshold) external onlyOwner {
        require(_minScoreThreshold <= 10000, "Threshold must be between 0 and 10000");
        minScoreThreshold = _minScoreThreshold;
    }
    
    /**
     * @dev Set the verification price
     * @param _verificationPrice New price in VERI tokens (with decimals)
     */
    function setVerificationPrice(uint256 _verificationPrice) external onlyOwner {
        verificationPrice = _verificationPrice;
        emit VerificationPriceUpdated(_verificationPrice);
    }
    
    /**
     * @dev Set the TruChain address
     * @param _truChainAddress Address of the TruChain contract
     */
    function setTruChain(address _truChainAddress) external onlyOwner {
        require(_truChainAddress != address(0), "Invalid token address");
        truChain = TruChain(_truChainAddress);
    }

    // Core verification functions
    function storeVerification(
        bytes32 contentHash,
        bytes32 modelId,
        uint256 scoreBps,
        uint256 timestamp
    ) external onlyVerifier returns (bool) {
        require(contentHash != bytes32(0), "Invalid content hash");
        require(modelId != bytes32(0), "Invalid model ID");
        require(approvedModels[modelId].approved, "Model not approved");
        require(scoreBps <= 10000, "Score must be between 0 and 10000");
        require(verifications[contentHash].contentHash == bytes32(0), "Image already verified");
        
        // Determine if the image is verified as real based on the score threshold
        // Lower score = more likely to be real
        bool isVerified = scoreBps < minScoreThreshold;
        
        // Store verification result
        verifications[contentHash] = VerificationResult({
            contentHash: contentHash,
            modelId: modelId,
            scoreBps: scoreBps,
            verified: isVerified,
            timestamp: timestamp,
            verifier: msg.sender
        });
        
        verificationCount++;
        
        emit ImageVerified(contentHash, modelId, scoreBps, isVerified, timestamp);
        
        return isVerified;
    }
    
    /**
     * @dev Store verification result with payment
     * @param contentHash Hash of the image content
     * @param modelId ID of the model used for verification
     * @param scoreBps Score in basis points (0-10000)
     * @param timestamp Timestamp when verification was performed
     * @return Whether the image is verified as real
     */
    function storeVerificationWithPayment(
        bytes32 contentHash,
        bytes32 modelId,
        uint256 scoreBps,
        uint256 timestamp
    ) external returns (bool) {
        // Process payment first
        require(verificationPrice > 0, "Verification price not set");
        require(truChain.balanceOf(msg.sender) >= verificationPrice, "Insufficient token balance");
        
        // User must have approved this contract to spend tokens
        require(truChain.processPayment(msg.sender, verificationPrice), "Payment processing failed");
        
        emit PaymentProcessed(msg.sender, verificationPrice);
        
        // Now perform the verification
        require(contentHash != bytes32(0), "Invalid content hash");
        require(modelId != bytes32(0), "Invalid model ID");
        require(approvedModels[modelId].approved, "Model not approved");
        require(scoreBps <= 10000, "Score must be between 0 and 10000");
        require(verifications[contentHash].contentHash == bytes32(0), "Image already verified");
        
        // Determine if the image is verified as real based on the score threshold
        // Lower score = more likely to be real
        bool isVerified = scoreBps < minScoreThreshold;
        
        // Store verification result
        verifications[contentHash] = VerificationResult({
            contentHash: contentHash,
            modelId: modelId,
            scoreBps: scoreBps,
            verified: isVerified,
            timestamp: timestamp,
            verifier: address(this) // Contract is the verifier for paid verifications
        });
        
        verificationCount++;
        
        emit ImageVerified(contentHash, modelId, scoreBps, isVerified, timestamp);
        
        return isVerified;
    }

    // View functions
    function getVerification(bytes32 contentHash) external view returns (VerificationResult memory) {
        require(verifications[contentHash].contentHash != bytes32(0), "Verification not found");
        return verifications[contentHash];
    }

    function isImageVerified(bytes32 contentHash) external view returns (bool) {
        if (verifications[contentHash].contentHash == bytes32(0)) {
            return false;
        }
        return verifications[contentHash].verified;
    }

    function getApprovedModels() external view returns (Model[] memory) {
        Model[] memory models = new Model[](modelIds.length);
        
        for (uint256 i = 0; i < modelIds.length; i++) {
            models[i] = approvedModels[modelIds[i]];
        }
        
        return models;
    }
}
