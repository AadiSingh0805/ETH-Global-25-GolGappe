// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BountyVault.sol";

/**
 * @title StudentVault
 * @notice Backward-compatible alias wrapper for BountyVault.
 */
contract StudentVault is BountyVault {
    constructor(IERC20 asset_) BountyVault(asset_) {}
}
