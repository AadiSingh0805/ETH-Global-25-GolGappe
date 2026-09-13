// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title BountyVault
 * @notice ERC-4626 Tokenized Vault implementation tailored for GitBountys.
 * Accepts MockUSDC (or underlying ERC-20 bounty asset) and issues vUSDC (Bounty Vault Shares)
 * to open-source developers and contributors.
 */
contract BountyVault is ERC4626 {
    // Application-specific feature tracking
    uint256 public totalYieldHarvested;

    event YieldHarvested(address indexed harvester, uint256 yieldAmount, uint256 newTotalAssets);

    constructor(IERC20 asset_)
        ERC20("GitBountys Vault Share", "vUSDC")
        ERC4626(asset_)
    {}

    /**
     * @notice Application-specific custom vault feature: harvest / inject bounty yield into the vault.
     * @dev Sponsors or repo owners transfer underlying asset into the vault without issuing new shares.
     * This directly increases totalAssets(), increasing the convertToAssets() share exchange rate
     * for all developer vault share holders.
     * @param yieldAmount Amount of underlying asset to deposit as yield/bonus pool.
     */
    function harvestYield(uint256 yieldAmount) external {
        require(yieldAmount > 0, "Yield amount must be greater than 0");
        
        // Transfer underlying asset into vault
        IERC20(asset()).transferFrom(msg.sender, address(this), yieldAmount);
        
        totalYieldHarvested += yieldAmount;
        
        emit YieldHarvested(msg.sender, yieldAmount, totalAssets());
    }

    /**
     * @notice Helper function to retrieve high-level vault metadata and state summary.
     */
    function getVaultDetails() external view returns (
        address assetAddress,
        uint256 totalUnderlyingAssets,
        uint256 totalVaultShares,
        uint256 totalHarvested
    ) {
        return (
            asset(),
            totalAssets(),
            totalSupply(),
            totalYieldHarvested
        );
    }
}
