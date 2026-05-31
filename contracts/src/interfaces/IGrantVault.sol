// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

interface IGrantVault {
    function payMilestone(bytes32 grantId, bytes32 milestoneId, address recipient, uint256 amount) external;
    function availableBalance(bytes32 grantId) external view returns (uint256); 
}