// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

interface IMilestoneRegistry {
    
    enum MilestoneStatus {
        NONE,
        PENDING,
        UNDER_REVIEW,
        APPROVED,
        PAID,
        REJECTED
    }

    struct Milestone {
        bytes32 grantId;
        bytes32 milestoneId;
        address builder;
        uint256 amount;
        string evidenceCid;
        string reviewNotes;
        MilestoneStatus status;
        uint256 submittedAt;
        uint256 reviewedAt;
        uint256 paidAt;
    }

    function getMilestoneStatus(bytes32 milestoneId) external view returns (MilestoneStatus);
    function getMilestone(bytes32 milestoneId) external view returns (Milestone memory);
}