// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IFeeCollector
 * @notice Receives platform fees from bounty payouts
 */
interface IFeeCollector {
    function collectFee(address token, uint256 amount) external;
}
