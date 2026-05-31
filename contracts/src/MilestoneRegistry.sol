// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IGrantVault } from "./interfaces/IGrantVault.sol";

contract MilestoneRegistry is Ownable {

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

    struct Grant {
        bytes32 grantId;
        string title;
        address committee;
        uint256 totalBudget;
        bool active;
    }

    IGrantVault public immutable vault;

    address public reviewerAgent;
    address public distributorAgent;

    mapping(bytes32 => Grant) public grants;
    mapping(bytes32 => Milestone) public milestones;
    mapping(bytes32 => bytes32[]) public grantMilestones;

    event GrantCreated(bytes32 indexed grantId, string title, address commitee, uint256 totalBudget);
    event MilestoneCreated(bytes32 indexed grantId, bytes32 indexed milestoneId, address builder, uint256 amount);
    event MilestoneSubmitted(bytes32 indexed milestoneId, string evidenceCid);
    event MilestoneUnderReview(bytes32 indexed milestoneId);
    event MilestoneApproved(bytes32 indexed milestoneId, string reviewNotes);
    event MilestoneRejected(bytes32 indexed milestoneId, string reviewNotes);
    event MilestonePaid(bytes32 indexed milestoneId, address builder, uint256 amount);
    event AgentUpdated(string role, address indexed agent);

    error OnlyReviewerAgent();
    error OnlyDistributorAgent();
    error OnlyCommittee();
    error MilestoneNotFound();
    error InvalidStatusTransition(MilestoneStatus current, MilestoneStatus expected);
    error GrantNotActive();
    error ZeroAddress();
    error EmptyCid();

    modifier onlyReviewer() {
        if (msg.sender != reviewerAgent) revert OnlyReviewerAgent();
        _;
    }

    modifier onlyDistributor() {
        if (msg.sender != distributorAgent) revert OnlyDistributorAgent();
        _;
    }

    modifier milestoneExists(bytes32 milestoneId) {
        if (milestones[milestoneId].status == MilestoneStatus.NONE) revert MilestoneNotFound();
        _;
    }

    constructor(address _vault, address _owner) Ownable(_owner) {
        if (_vault == address(0)) revert ZeroAddress();
        vault = IGrantVault(_vault);
    }

    function setReviewerAgent(address _agent) external onlyOwner {
        if (_agent == address(0)) revert ZeroAddress();
        reviewerAgent = _agent;

        emit AgentUpdated("reviewer", _agent);
    }

    function setDistributorAgent(address _agent) external onlyOwner {
        if (_agent == address(0)) revert ZeroAddress();
        distributorAgent = _agent;

        emit AgentUpdated("distributor", _agent);
    }

    function createGrant(bytes32 grantId, string calldata title, uint256 totalBudget) external {
        grants[grantId] = Grant({
            grantId: grantId,
            title: title,
            committee: msg.sender,
            totalBudget: totalBudget,
            active: true
        });

        emit GrantCreated(grantId, title, msg.sender, totalBudget);
    }

    function addMilestone(bytes32 grantId, bytes32 milestoneId, address builder, uint256 amount) external {
        Grant storage grant = grants[grantId];

        if (!grant.active) revert GrantNotActive();
        if (msg.sender != grant.committee) revert OnlyCommittee();
        if (builder == address(0)) revert ZeroAddress();

        milestones[milestoneId] = Milestone({
            grantId: grantId,
            milestoneId: milestoneId,
            builder: builder,
            amount: amount,
            evidenceCid: "",
            reviewNotes: "",
            status: MilestoneStatus.PENDING,
            submittedAt: 0,
            reviewedAt: 0,
            paidAt: 0
        });

        grantMilestones[grantId].push(milestoneId);

        emit MilestoneCreated(grantId, milestoneId, builder, amount);
    }

    function submitEvidence(bytes32 milestoneId, string calldata evidenceCid) external milestoneExists(milestoneId) {
        if (bytes(evidenceCid).length == 0) revert EmptyCid();

        Milestone storage m = milestones[milestoneId];

        if (msg.sender != m.builder) revert OnlyCommittee();
        if (m.status != MilestoneStatus.PENDING && m.status != MilestoneStatus.REJECTED) {
            revert InvalidStatusTransition(m.status, MilestoneStatus.PENDING);
        }

        m.evidenceCid = evidenceCid;
        m.submittedAt = block.timestamp;
        m.status = MilestoneStatus.PENDING;

        emit MilestoneSubmitted(milestoneId, evidenceCid);
    }

    function markUnderReview(bytes32 milestoneId) external onlyReviewer milestoneExists(milestoneId) {
        Milestone storage m = milestones[milestoneId];

        if (m.status != MilestoneStatus.PENDING) {
            revert InvalidStatusTransition(m.status, MilestoneStatus.PENDING);
        }
        m.status = MilestoneStatus.UNDER_REVIEW;

        emit MilestoneUnderReview(milestoneId);
    }

    function approveMilestone(bytes32 milestoneId, string calldata reviewNotes) external onlyReviewer milestoneExists(milestoneId) {
        Milestone storage m = milestones[milestoneId];

        if (m.status != MilestoneStatus.UNDER_REVIEW) {
            revert InvalidStatusTransition(m.status, MilestoneStatus.UNDER_REVIEW);
        }

        m.status = MilestoneStatus.APPROVED;
        m.reviewNotes = reviewNotes;
        m.reviewedAt = block.timestamp;

        emit MilestoneApproved(milestoneId, reviewNotes);
    }

    function rejectMilestone(bytes32 milestoneId, string calldata reviewNotes) external onlyReviewer milestoneExists(milestoneId) {
        Milestone storage m = milestones[milestoneId];

        if (m.status != MilestoneStatus.UNDER_REVIEW) {
            revert InvalidStatusTransition(m.status, MilestoneStatus.UNDER_REVIEW);
        }

        m.status = MilestoneStatus.REJECTED;
        m.reviewNotes = reviewNotes;
        m.reviewedAt = block.timestamp;

        emit MilestoneRejected(milestoneId, reviewNotes);
    }

    function executePayout(bytes32 milestoneId) external onlyDistributor milestoneExists(milestoneId) {
        Milestone storage m= milestones[milestoneId];

        if (m.status != MilestoneStatus.APPROVED) {
            revert InvalidStatusTransition(m.status, MilestoneStatus.APPROVED);
        }

        m.status = MilestoneStatus.PAID;
        m.paidAt = block.timestamp;
        vault.payMilestone(m.grantId, milestoneId, m.builder, m.amount);

        emit MilestonePaid(milestoneId, m.builder, m.amount);
    }

    function getMilestone(bytes32 milestoneId) external view returns (Milestone memory) {
        return milestones[milestoneId];
    }

    function getGrantMilestones(bytes32 grantId) external view returns (bytes32[] memory) {
        return grantMilestones[grantId];
    }

    function getMilestoneStatus(bytes32 milestoneId) external view returns (MilestoneStatus) {
        return milestones[milestoneId].status;
    }
}