// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IFeeCollector.sol";

/**
 * @title FeeCollector
 * @notice Collects 3% platform fees from bounty payouts
 */
contract FeeCollector is IFeeCollector, Ownable {
    using SafeERC20 for IERC20;

    uint256 public totalFeesCollected;
    mapping(address => uint256) public feesByToken;

    event FeeCollected(address indexed token, uint256 amount);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function collectFee(address token, uint256 amount) external override {
        feesByToken[token] += amount;
        totalFeesCollected += amount;
        emit FeeCollected(token, amount);
    }

    function withdraw(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }
}
