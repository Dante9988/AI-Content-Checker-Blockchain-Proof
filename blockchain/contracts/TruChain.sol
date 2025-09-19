// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TruChain
 * @dev ERC20 token for the TruChain ecosystem
 * Used to pay for image verification services
 */
contract TruChain is ERC20, Ownable {
    // Events
    event TokensBurned(address indexed burner, uint256 amount);
    event TokensAddedToPool(address indexed pool, uint256 amount);

    // Address of the staking reward pool
    address public stakingPool;
    
    // Percentage of tokens to burn (out of 100)
    uint8 public burnPercentage = 50;

    /**
     * @dev Constructor that gives the msg.sender all existing tokens.
     */
    constructor(uint256 initialSupply) ERC20("TruChain", "TRU") {
        _mint(msg.sender, initialSupply * (10 ** uint256(decimals())));
        stakingPool = msg.sender; // Initially, the owner is the staking pool
    }

    /**
     * @dev Function to mint new tokens
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint
     * @return A boolean that indicates if the operation was successful
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        _mint(to, amount);
        return true;
    }

    /**
     * @dev Set the staking pool address
     * @param _stakingPool Address of the staking pool
     */
    function setStakingPool(address _stakingPool) external onlyOwner {
        require(_stakingPool != address(0), "TruChain: staking pool cannot be the zero address");
        stakingPool = _stakingPool;
    }

    /**
     * @dev Set the burn percentage
     * @param _burnPercentage Percentage of tokens to burn (out of 100)
     */
    function setBurnPercentage(uint8 _burnPercentage) external onlyOwner {
        require(_burnPercentage <= 100, "TruChain: burn percentage cannot exceed 100");
        burnPercentage = _burnPercentage;
    }

    /**
     * @dev Process payment for verification service
     * Burns burnPercentage% of tokens and sends the rest to the staking pool
     * @param from Address to take tokens from
     * @param amount Amount of tokens to process
     * @return success Whether the operation was successful
     */
    function processPayment(address from, uint256 amount) external returns (bool) {
        require(msg.sender == owner() || msg.sender == stakingPool, "TruChain: caller is not authorized");
        
        // Calculate amounts to burn and to send to pool
        uint256 burnAmount = (amount * burnPercentage) / 100;
        uint256 poolAmount = amount - burnAmount;
        
        // Check if the user has approved this contract to spend their tokens
        require(allowance(from, msg.sender) >= amount, "TruChain: insufficient allowance");
        
        // Transfer tokens from user to this contract using transferFrom
        bool success = transferFrom(from, address(this), amount);
        require(success, "TruChain: transfer failed");
        
        // Burn tokens
        _burn(address(this), burnAmount);
        emit TokensBurned(from, burnAmount);
        
        // Send tokens to staking pool
        _transfer(address(this), stakingPool, poolAmount);
        emit TokensAddedToPool(stakingPool, poolAmount);
        
        return true;
    }
}
