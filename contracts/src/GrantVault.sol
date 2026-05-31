// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract GrantVault is ReentrancyGuard, Ownable {

    using SafeERC20 for IERC20;
    IERC20 public immutable usdc;
    address public milestoneRegistry;
    uint256 public totalAllocated;

    mapping(bytes32 => uint256) public grantAllocation;
    mapping(bytes32 => uint256) public grantPaid;

    event GrantFunded(bytes32 indexed grantId, address indexed funder, uint256 amount);
    event MilestonePaid(bytes32 indexed grantId, bytes32 indexed milestoneId, address recipient, uint256 amount);
    event RegistryUpdated(address indexed oldRegistry, address indexed newRegistry);
    event FundsRecovered(address indexed to, uint256 amount);

    error OnlyRegistry();
    error InsufficientGrantBalance();
    error ZeroAmount();
    error ZeroAddress();
    error RegistryAlreadySet();

    constructor(address _usdc, address _owner) Ownable(_owner) {
        if (_usdc == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
    }

    function setMilestoneRegistry(address _registry) external onlyOwner {
        if (milestoneRegistry != address(0)) revert RegistryAlreadySet();
        if (_registry == address(0)) revert ZeroAddress();
        emit RegistryUpdated(address(0), _registry);
        milestoneRegistry = _registry;
    }

    function fundGrant(bytes32 grantId, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        grantAllocation[grantId] += amount;
        totalAllocated += amount;

        emit GrantFunded(grantId, msg.sender, amount);
    }

    function payMilestone(
        bytes32 grantId,
        bytes32 milestoneId,
        address recipient,
        uint256 amount
    ) external nonReentrant {
        if (msg.sender != milestoneRegistry) revert OnlyRegistry();
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 available = grantAllocation[grantId] - grantPaid[grantId];
        if (available < amount) revert InsufficientGrantBalance();

        grantPaid[grantId] += amount;
        usdc.safeTransfer(recipient, amount);

        emit MilestonePaid(grantId, milestoneId, recipient, amount);
    }

    function availableBalance(bytes32 grantId) external view returns (uint256) {
        return grantAllocation[grantId] - grantPaid[grantId];
    }

    function unallocatedBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this)) - totalAllocated;
    }

    function recoverUnallocated(address to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 amount = usdc.balanceOf(address(this)) - totalAllocated;
        if (amount == 0) revert ZeroAmount();
        usdc.safeTransfer(to, amount);

        emit FundsRecovered(to, amount);
    }
}