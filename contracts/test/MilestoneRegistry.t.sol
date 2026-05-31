// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { Test, console2 } from "forge-std/Test.sol";
import { MilestoneRegistry } from "../src/MilestoneRegistry.sol";
import { GrantVault } from "../src/GrantVault.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

contract MilestoneRegistryTest is Test {

    MilestoneRegistry registry;
    GrantVault vault;
    MockERC20 usdc;

    address committee = makeAddr("committee");
    address reviewerAgent = makeAddr("reviewer");
    address distributorAgent = makeAddr("distributor");
    address builder = makeAddr("builder");
    address funder = makeAddr("funder");
    address attacker = makeAddr("attacker");

    bytes32 GRANT_ID = keccak256("test-grant");
    bytes32 MILESTONE_ID = keccak256("test-milestone");

    string constant EVIDENCE_CID  = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
    string constant REVIEW_NOTES  = "All deliverables met. GitHub PR #42 merged. Tests passing.";

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        vault = new GrantVault(address(usdc), committee);
        registry = new MilestoneRegistry(address(vault), committee);

        vm.prank(committee);
        vault.setMilestoneRegistry(address(registry));

        vm.startPrank(committee);
        registry.setReviewerAgent(reviewerAgent);
        registry.setDistributorAgent(distributorAgent);
        vm.stopPrank();

        vm.prank(committee);
        registry.createGrant(GRANT_ID, "GrantGuard Test Grant", 5000e6);

        usdc.mint(funder, 5000e6);
        vm.prank(funder);
        usdc.approve(address(vault), 5000e6);
        vm.prank(funder);
        vault.fundGrant(GRANT_ID, 5000e6);

        vm.prank(committee);
        registry.addMilestone(GRANT_ID, MILESTONE_ID, builder, 500e6);
    }

    function test_createGrant_storesCorrectly() public view {
        (
            bytes32 grantId,
            string memory title,
            address comm,
            uint256 budget,
            bool active
        ) = registry.grants(GRANT_ID);

        assertEq(grantId, GRANT_ID);
        assertEq(title, "GrantGuard Test Grant");
        assertEq(comm, committee);
        assertEq(budget, 5000e6);
        assertTrue(active);
    }

    function test_addMilestone_startsAsPending() public view {
        MilestoneRegistry.MilestoneStatus status = registry.getMilestoneStatus(MILESTONE_ID);
        assertEq(uint8(status), uint8(MilestoneRegistry.MilestoneStatus.PENDING));
    }

    function test_addMilestone_revertsIfNotCommittee() public {
        vm.prank(attacker);
        vm.expectRevert(MilestoneRegistry.OnlyCommittee.selector);
        registry.addMilestone(GRANT_ID, keccak256("evil"), builder, 100e6);
    }

    function test_addMilestone_revertsIfGrantNotActive() public {
        bytes32 fakegrant = keccak256("nonexistent");
        vm.prank(committee);
        vm.expectRevert(MilestoneRegistry.GrantNotActive.selector);
        registry.addMilestone(fakegrant, keccak256("m"), builder, 100e6);
    }

    function test_submitEvidence_updatesCid() public {
        vm.prank(builder);
        registry.submitEvidence(MILESTONE_ID, EVIDENCE_CID);

        MilestoneRegistry.Milestone memory m = registry.getMilestone(MILESTONE_ID);
        assertEq(m.evidenceCid, EVIDENCE_CID);
        assertEq(m.submittedAt, block.timestamp);
    }

    function test_submitEvidence_revertsIfNotBuilder() public {
        vm.prank(attacker);
        vm.expectRevert();
        registry.submitEvidence(MILESTONE_ID, EVIDENCE_CID);
    }

    function test_submitEvidence_revertsIfEmptyCid() public {
        vm.prank(builder);
        vm.expectRevert(MilestoneRegistry.EmptyCid.selector);
        registry.submitEvidence(MILESTONE_ID, "");
    }

    function test_submitEvidence_allowsResubmissionFromRejected() public {
        vm.prank(builder);
        registry.submitEvidence(MILESTONE_ID, EVIDENCE_CID);
        vm.prank(reviewerAgent);
        registry.markUnderReview(MILESTONE_ID);
        vm.prank(reviewerAgent);
        registry.rejectMilestone(MILESTONE_ID, "Incomplete deliverable");

        vm.prank(builder);
        registry.submitEvidence(MILESTONE_ID, "bafynewcid123");

        MilestoneRegistry.Milestone memory m = registry.getMilestone(MILESTONE_ID);
        assertEq(uint8(m.status), uint8(MilestoneRegistry.MilestoneStatus.PENDING));
        assertEq(m.evidenceCid, "bafynewcid123");
    }

    function test_markUnderReview_transitionsStatus() public {
        vm.prank(builder);
        registry.submitEvidence(MILESTONE_ID, EVIDENCE_CID);

        vm.prank(reviewerAgent);
        registry.markUnderReview(MILESTONE_ID);

        assertEq(
            uint8(registry.getMilestoneStatus(MILESTONE_ID)),
            uint8(MilestoneRegistry.MilestoneStatus.UNDER_REVIEW)
        );
    }

    function test_markUnderReview_revertsIfNotAgent() public {
        vm.prank(attacker);
        vm.expectRevert(MilestoneRegistry.OnlyReviewerAgent.selector);
        registry.markUnderReview(MILESTONE_ID);
    }

    function test_markUnderReview_revertsIfNotPending() public {
        vm.prank(builder);
        registry.submitEvidence(MILESTONE_ID, EVIDENCE_CID);
        vm.prank(reviewerAgent);
        registry.markUnderReview(MILESTONE_ID);

        vm.prank(reviewerAgent);
        vm.expectRevert();
        registry.markUnderReview(MILESTONE_ID);
    }

    function _reviewCycle() internal {
        vm.prank(builder);
        registry.submitEvidence(MILESTONE_ID, EVIDENCE_CID);
        vm.prank(reviewerAgent);
        registry.markUnderReview(MILESTONE_ID);
    }

    function test_approveMilestone_setsStatus() public {
        _reviewCycle();
        vm.prank(reviewerAgent);
        registry.approveMilestone(MILESTONE_ID, REVIEW_NOTES);

        assertEq(
            uint8(registry.getMilestoneStatus(MILESTONE_ID)),
            uint8(MilestoneRegistry.MilestoneStatus.APPROVED)
        );
    }

    function test_approveMilestone_storesNotes() public {
        _reviewCycle();
        vm.prank(reviewerAgent);
        registry.approveMilestone(MILESTONE_ID, REVIEW_NOTES);

        MilestoneRegistry.Milestone memory m = registry.getMilestone(MILESTONE_ID);
        assertEq(m.reviewNotes, REVIEW_NOTES);
        assertEq(m.reviewedAt, block.timestamp);
    }

    function test_approveMilestone_revertsIfNotUnderReview() public {
        vm.prank(reviewerAgent);
        vm.expectRevert();
        registry.approveMilestone(MILESTONE_ID, REVIEW_NOTES);
    }

    function test_rejectMilestone_setsStatus() public {
        _reviewCycle();
        vm.prank(reviewerAgent);
        registry.rejectMilestone(MILESTONE_ID, "Missing tests");

        assertEq(
            uint8(registry.getMilestoneStatus(MILESTONE_ID)),
            uint8(MilestoneRegistry.MilestoneStatus.REJECTED)
        );
    }

    function test_executePayout_sendsUSDCToBuilder() public {
        _reviewCycle();
        vm.prank(reviewerAgent);
        registry.approveMilestone(MILESTONE_ID, REVIEW_NOTES);

        uint256 balanceBefore = usdc.balanceOf(builder);

        vm.prank(distributorAgent);
        registry.executePayout(MILESTONE_ID);

        assertEq(usdc.balanceOf(builder), balanceBefore + 500e6);
    }

    function test_executePayout_setsMilestonePaid() public {
        _reviewCycle();
        vm.prank(reviewerAgent);
        registry.approveMilestone(MILESTONE_ID, REVIEW_NOTES);

        vm.prank(distributorAgent);
        registry.executePayout(MILESTONE_ID);

        assertEq(
            uint8(registry.getMilestoneStatus(MILESTONE_ID)),
            uint8(MilestoneRegistry.MilestoneStatus.PAID)
        );
    }

    function test_executePayout_revertsIfNotDistributor() public {
        _reviewCycle();
        vm.prank(reviewerAgent);
        registry.approveMilestone(MILESTONE_ID, REVIEW_NOTES);

        vm.prank(attacker);
        vm.expectRevert(MilestoneRegistry.OnlyDistributorAgent.selector);
        registry.executePayout(MILESTONE_ID);
    }

    function test_executePayout_revertsIfNotApproved() public {
        vm.prank(distributorAgent);
        vm.expectRevert();
        registry.executePayout(MILESTONE_ID);
    }

    function test_executePayout_cannotPayTwice() public {
        _reviewCycle();
        vm.prank(reviewerAgent);
        registry.approveMilestone(MILESTONE_ID, REVIEW_NOTES);

        vm.prank(distributorAgent);
        registry.executePayout(MILESTONE_ID);

        vm.prank(distributorAgent);
        vm.expectRevert();
        registry.executePayout(MILESTONE_ID);
    }

    function test_fullHappyPath() public {
        uint256 builderStart = usdc.balanceOf(builder);

        vm.prank(builder);
        registry.submitEvidence(MILESTONE_ID, EVIDENCE_CID);

        vm.prank(reviewerAgent);
        registry.markUnderReview(MILESTONE_ID);

        vm.prank(reviewerAgent);
        registry.approveMilestone(MILESTONE_ID, "Excellent work. All criteria met.");

        vm.prank(distributorAgent);
        registry.executePayout(MILESTONE_ID);

        MilestoneRegistry.Milestone memory m = registry.getMilestone(MILESTONE_ID);
        assertEq(uint8(m.status), uint8(MilestoneRegistry.MilestoneStatus.PAID));
        assertEq(usdc.balanceOf(builder), builderStart + 500e6);
        assertEq(vault.grantPaid(GRANT_ID), 500e6);

        console2.log("Full happy path passed. Builder received 500 USDC.");
    }
}
