// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IFeeCollector.sol";

/**
 * @title BountyEscrow
 * @notice Holds USDC for a single bounty until approval or expiry refund
 * @dev Supports standard (full upfront) and Rally (crowdfunded) modes
 */
contract BountyEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status {
        Open,
        Submitted,
        Approved,
        Paid,
        Expired,
        Disputed,
        Refunded
    }

    IERC20 public immutable usdc;
    IFeeCollector public immutable feeCollector;
    address public immutable creator;
    address public immutable factory;
    uint256 public immutable reward;
    uint256 public immutable platformFeeBps;
    uint256 public immutable deadline;
    uint256 public immutable disputeWindow;
    bool public immutable isRally;

    uint256 public fundedAmount;
    Status public status;
    string public bountyId;

    event SubmissionReceived(address indexed hunter);
    event Approved(address indexed hunter, uint256 payout, uint256 fee);
    event Refunded(address indexed creator, uint256 amount);
    event Disputed(address indexed initiator);
    event RallyFunded(address indexed backer, uint256 amount, uint256 totalFunded);

    modifier onlyCreator() {
        require(msg.sender == creator, "Not creator");
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "Not factory");
        _;
    }

    constructor(
        address _usdc,
        address _feeCollector,
        address _creator,
        uint256 _reward,
        uint256 _platformFeeBps,
        uint256 _deadline,
        uint256 _disputeWindow,
        string memory _bountyId,
        bool _isRally,
        uint256 _initialFunding
    ) {
        usdc = IERC20(_usdc);
        feeCollector = IFeeCollector(_feeCollector);
        creator = _creator;
        factory = msg.sender;
        reward = _reward;
        platformFeeBps = _platformFeeBps;
        deadline = _deadline;
        disputeWindow = _disputeWindow;
        bountyId = _bountyId;
        isRally = _isRally;
        fundedAmount = _initialFunding;
        status = Status.Open;
    }

    function contribute(uint256 amount) external nonReentrant {
        require(isRally, "Not a rally");
        require(status == Status.Open, "Not open");
        require(amount > 0, "Invalid amount");
        require(fundedAmount < reward, "Fully funded");

        uint256 remaining = reward - fundedAmount;
        uint256 deposit = amount > remaining ? remaining : amount;

        usdc.safeTransferFrom(msg.sender, address(this), deposit);
        fundedAmount += deposit;

        emit RallyFunded(msg.sender, deposit, fundedAmount);
    }

    function creditFunding(uint256 amount, address backer) external onlyFactory {
        require(isRally, "Not a rally");
        require(status == Status.Open, "Not open");
        require(amount > 0, "Invalid amount");
        require(fundedAmount < reward, "Fully funded");

        uint256 remaining = reward - fundedAmount;
        uint256 deposit = amount > remaining ? remaining : amount;
        require(deposit == amount, "Exceeds remaining");

        fundedAmount += deposit;
        emit RallyFunded(backer, deposit, fundedAmount);
    }

    function submit(address _hunter) external onlyCreator {
        require(status == Status.Open, "Not open");
        require(_hunter != address(0), "Invalid hunter");
        status = Status.Submitted;
        emit SubmissionReceived(_hunter);
    }

    function approveAndPay(address _hunter) external nonReentrant onlyCreator {
        require(status == Status.Open || status == Status.Submitted, "Invalid status");
        require(_hunter != address(0), "Invalid hunter");
        if (isRally) {
            require(fundedAmount >= reward, "Rally underfunded");
        }

        uint256 fee = (reward * platformFeeBps) / 10000;
        uint256 payout = reward - fee;

        status = Status.Paid;

        usdc.safeTransfer(_hunter, payout);
        usdc.safeTransfer(address(feeCollector), fee);
        feeCollector.collectFee(address(usdc), fee);

        emit Approved(_hunter, payout, fee);
    }

    function refund() external nonReentrant {
        require(block.timestamp > deadline + disputeWindow, "Dispute window active");
        require(status == Status.Open || status == Status.Submitted, "Cannot refund");
        require(msg.sender == creator || msg.sender == factory, "Not authorized");

        uint256 amount = fundedAmount;
        status = Status.Refunded;
        fundedAmount = 0;
        usdc.safeTransfer(creator, amount);
        emit Refunded(creator, amount);
    }

    function markDisputed() external onlyCreator {
        require(status == Status.Submitted, "Not submitted");
        status = Status.Disputed;
        emit Disputed(msg.sender);
    }
}
