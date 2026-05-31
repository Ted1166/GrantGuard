// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { CaveatEnforcer } from "@metamask/delegation-framework/src/enforcers/CaveatEnforcer.sol";
import { ModeCode } from "@metamask/delegation-framework/src/utils/Types.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IMilestoneRegistry } from "./interfaces/IMilestoneRegistry.sol";

contract MilestoneCapEnforcer is CaveatEnforcer {

    bytes4 private constant TRANSFER_SELECTOR = bytes4(keccak256("transfer(address,uint256)"));
    
    uint8 private constant USDC_DECIMALS = 6;

    error InvalidTermsLength();
    error MilestoneNotApproved(bytes32 milestoneId);
    error AmountExeedsCap(uint256 attempted, uint256 cap);
    error AmountMismatch(uint256 calldataAmount, uint256 registeredAmount);
    error InvalidCalldata();
    error MilestoneIdMismatch();

    function beforeHook(
        bytes calldata _terms,
        bytes calldata _args,
        ModeCode _mode,
        bytes calldata _executionCallData,
        bytes32 _delegationHash,
        address,
        address
    ) public override {
        if (_terms.length != 96) revert InvalidTermsLength();

        (bytes32 milestoneId, uint256 maxAmount, address registryAddr) = abi.decode(_terms, (bytes32, uint256, address));

        IMilestoneRegistry registry = IMilestoneRegistry(registryAddr);

        IMilestoneRegistry.MilestoneStatus status = registry.getMilestoneStatus(milestoneId);
        if (status != IMilestoneRegistry.MilestoneStatus.APPROVED) {
            revert MilestoneNotApproved(milestoneId);
        }

        if (_executionCallData.length < 68) revert InvalidCalldata();

        bytes4 selector = bytes4(_executionCallData[0:4]);
        if (selector != TRANSFER_SELECTOR) revert InvalidCalldata();

        bytes memory calldataCopy = _executionCallData[4:];
        (, uint256 transferAmount) = abi.decode(calldataCopy, (address, uint256));

        if (transferAmount > maxAmount) {
            revert AmountExeedsCap(transferAmount, maxAmount);
        }

        IMilestoneRegistry.Milestone memory milestone = registry.getMilestone(milestoneId);
        if (transferAmount != milestone.amount) {
            revert AmountMismatch(transferAmount, milestone.amount);
        }
    }

    function afterHook(bytes calldata, bytes calldata, ModeCode, bytes calldata, bytes32, address, address) public override {}

    function encodeTerms(bytes32 milestoneId, uint256 maxAmount, address registry) external pure returns (bytes memory) {
        return abi.encode(milestoneId, maxAmount, registry);
    }
}