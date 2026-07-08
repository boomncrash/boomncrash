// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./BountyEscrow.sol";
import "./FeeCollector.sol";

/**
 * @title BountyFactory
 * @notice Deploys bounty escrows and locks USDC from creators and Rally backers
 */
contract BountyFactory {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    FeeCollector public immutable feeCollector;
    uint256 public immutable platformFeeBps;
    uint256 public immutable disputeWindow;

    address[] public allEscrows;
    mapping(string => address) public escrowByBountyId;

    event BountyCreated(
        string indexed bountyId,
        address indexed escrow,
        address indexed creator,
        uint256 reward,
        uint256 deadline
    );

    event RallyCreated(
        string indexed bountyId,
        address indexed escrow,
        address indexed creator,
        uint256 targetReward,
        uint256 creatorSeed,
        uint256 deadline
    );

    event RallyContribution(
        string indexed bountyId,
        address indexed backer,
        uint256 amount,
        uint256 totalFunded
    );

    constructor(
        address _usdc,
        address _feeCollector,
        uint256 _platformFeeBps,
        uint256 _disputeWindow
    ) {
        usdc = IERC20(_usdc);
        feeCollector = FeeCollector(_feeCollector);
        platformFeeBps = _platformFeeBps;
        disputeWindow = _disputeWindow;
    }

    function createBounty(
        string calldata bountyId,
        uint256 reward,
        uint256 deadline
    ) external returns (address escrow) {
        require(reward > 0, "Invalid reward");
        require(deadline > block.timestamp, "Invalid deadline");
        require(escrowByBountyId[bountyId] == address(0), "Bounty exists");

        BountyEscrow escrowContract = new BountyEscrow(
            address(usdc),
            address(feeCollector),
            msg.sender,
            reward,
            platformFeeBps,
            deadline,
            disputeWindow,
            bountyId,
            false,
            reward
        );

        escrow = address(escrowContract);
        usdc.safeTransferFrom(msg.sender, escrow, reward);

        allEscrows.push(escrow);
        escrowByBountyId[bountyId] = escrow;

        emit BountyCreated(bountyId, escrow, msg.sender, reward, deadline);
    }

    function createRally(
        string calldata bountyId,
        uint256 targetReward,
        uint256 creatorSeed,
        uint256 deadline
    ) external returns (address escrow) {
        require(targetReward > 0, "Invalid reward");
        require(creatorSeed > 0 && creatorSeed <= targetReward, "Invalid seed");
        require(deadline > block.timestamp, "Invalid deadline");
        require(escrowByBountyId[bountyId] == address(0), "Bounty exists");

        BountyEscrow escrowContract = new BountyEscrow(
            address(usdc),
            address(feeCollector),
            msg.sender,
            targetReward,
            platformFeeBps,
            deadline,
            disputeWindow,
            bountyId,
            true,
            creatorSeed
        );

        escrow = address(escrowContract);
        usdc.safeTransferFrom(msg.sender, escrow, creatorSeed);

        allEscrows.push(escrow);
        escrowByBountyId[bountyId] = escrow;

        emit RallyCreated(bountyId, escrow, msg.sender, targetReward, creatorSeed, deadline);
    }

    function contributeToRally(
        string calldata bountyId,
        uint256 amount
    ) external {
        address escrowAddr = escrowByBountyId[bountyId];
        require(escrowAddr != address(0), "Rally not found");

        BountyEscrow escrow = BountyEscrow(escrowAddr);

        usdc.safeTransferFrom(msg.sender, escrowAddr, amount);
        escrow.creditFunding(amount, msg.sender);

        emit RallyContribution(bountyId, msg.sender, amount, escrow.fundedAmount());
    }

    function getEscrowCount() external view returns (uint256) {
        return allEscrows.length;
    }
}
