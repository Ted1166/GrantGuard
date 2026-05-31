// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { Test, console2 } from "forge-std/Test.sol";
import { MilestoneCapEnforcer } from "../src/MilestoneCapEnforcer.sol";
import { MilestoneRegistry } from "../src/MilestoneRegistry.sol";
import { GrantVault } from "../src/GrantVault.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";
import { ModeCode } from "@metamask/delegation-framework/src/utils/Types.sol";

contract MilestoneCapEnforcerTest is Test {

    MilestoneCapEnforcer enforcer;
    MilestoneRegistry registry;
    GrantVault vault;
    MockERC20 usdc;

    address committee = makeAddr("committee");
    address reviewerAgent = makeAddr("reviewer");
    address distributorAgent = makeAddr("distributor");
    address builder = makeAddr("builder");
    address funder = makeAddr("funder");

    bytes32 GRANT_ID = keccak256("grant-enforcer-test");
    bytes32 MILESTONE_ID = keccak256("milestone-enforcer-test");
    uint256 MILESTONE_AMOUNT = 1000e6;

    ModeCode dummyMode;

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        vault = new GrantVault(address(usdc), committee);
        registry = new MilestoneRegistry(address(vault), committee);
        enforcer = new MilestoneCapEnforcer();

        vm.prank(committee);
        vault.setMilestoneRegistry(address(registry));

        vm.startPrank(committee);
        registry.setReviewerAgent(reviewerAgent);
        registry.setDistributorAgent(distributorAgent);
        vm.stopPrank();

        vm.prank(committee);
        registry.createGrant(GRANT_ID, "Test Grant", 5000e6);

        vm.prank(committee);
        registry.addMilestone(GRANT_ID, MILESTONE_ID, builder, MILESTONE_AMOUNT);

        usdc.mint(funder, 5000e6);
        vm.prank(funder);
        usdc.approve(address(vault), 5000e6);
        vm.prank(funder);
        vault.fundGrant(GRANT_ID, 5000e6);
    }

    function _terms(bytes32 milestoneId, uint256 maxAmount) internal view returns (bytes memory) {
        return abi.encode(milestoneId, maxAmount, address(registry));
    }

    function _transferCalldata(address to, uint256 amount) internal pure returns (bytes memory) {
        return abi.encodeWithSignature("transfer(address,uint256)", to, amount);
    }

    function _approveViaAgents() internal {
        vm.prank(builder);
        registry.submitEvidence(MILESTONE_ID, "bafybeicid");
        vm.prank(reviewerAgent);
        registry.markUnderReview(MILESTONE_ID);
        vm.prank(reviewerAgent);
        registry.approveMilestone(MILESTONE_ID, "Approved by Venice AI");
    }

    function test_beforeHook_passesForValidApprovedMilestone() public {
        _approveViaAgents();

        bytes memory terms = _terms(MILESTONE_ID, MILESTONE_AMOUNT);
        bytes memory execCalldata = _transferCalldata(builder, MILESTONE_AMOUNT);

        enforcer.beforeHook(
            terms,
            "",
            dummyMode,
            execCalldata,
            bytes32(0),
            address(0),
            address(0)
        );
    }

    function test_beforeHook_revertsOnInvalidTermsLength() public {
        bytes memory badTerms = abi.encode(MILESTONE_ID, MILESTONE_AMOUNT);
        bytes memory execCalldata = _transferCalldata(builder, MILESTONE_AMOUNT);

        vm.expectRevert(MilestoneCapEnforcer.InvalidTermsLength.selector);
        enforcer.beforeHook(badTerms, "", dummyMode, execCalldata, bytes32(0), address(0), address(0));
    }

    function test_beforeHook_revertsIfMilestonePending() public {
        bytes memory terms = _terms(MILESTONE_ID, MILESTONE_AMOUNT);
        bytes memory execCalldata = _transferCalldata(builder, MILESTONE_AMOUNT);

        vm.expectRevert(
            abi.encodeWithSelector(MilestoneCapEnforcer.MilestoneNotApproved.selector, MILESTONE_ID)
        );
        enforcer.beforeHook(terms, "", dummyMode, execCalldata, bytes32(0), address(0), address(0));
    }

    function test_beforeHook_revertsIfMilestoneUnderReview() public {
        vm.prank(builder);
        registry.submitEvidence(MILESTONE_ID, "bafycid");
        vm.prank(reviewerAgent);
        registry.markUnderReview(MILESTONE_ID);

        bytes memory terms = _terms(MILESTONE_ID, MILESTONE_AMOUNT);
        bytes memory execCalldata = _transferCalldata(builder, MILESTONE_AMOUNT);

        vm.expectRevert(
            abi.encodeWithSelector(MilestoneCapEnforcer.MilestoneNotApproved.selector, MILESTONE_ID)
        );
        enforcer.beforeHook(terms, "", dummyMode, execCalldata, bytes32(0), address(0), address(0));
    }

    function test_beforeHook_revertsIfMilestoneRejected() public {
        vm.prank(builder);
        registry.submitEvidence(MILESTONE_ID, "bafycid");
        vm.prank(reviewerAgent);
        registry.markUnderReview(MILESTONE_ID);
        vm.prank(reviewerAgent);
        registry.rejectMilestone(MILESTONE_ID, "Incomplete");

        bytes memory terms = _terms(MILESTONE_ID, MILESTONE_AMOUNT);
        bytes memory execCalldata = _transferCalldata(builder, MILESTONE_AMOUNT);

        vm.expectRevert(
            abi.encodeWithSelector(MilestoneCapEnforcer.MilestoneNotApproved.selector, MILESTONE_ID)
        );
        enforcer.beforeHook(terms, "", dummyMode, execCalldata, bytes32(0), address(0), address(0));
    }

    function test_beforeHook_revertsIfAmountExceedsCap() public {
        _approveViaAgents();

        uint256 cap = 800e6;
        bytes memory terms = _terms(MILESTONE_ID, cap);
        bytes memory execCalldata = _transferCalldata(builder, MILESTONE_AMOUNT);

        vm.expectRevert(
            abi.encodeWithSelector(MilestoneCapEnforcer.AmountExeedsCap.selector, MILESTONE_AMOUNT, cap)
        );
        enforcer.beforeHook(terms, "", dummyMode, execCalldata, bytes32(0), address(0), address(0));
    }

    function test_beforeHook_revertsIfAmountDoesNotMatchMilestone() public {
        _approveViaAgents();

        uint256 partialAmount = 1e6;
        bytes memory terms = _terms(MILESTONE_ID, MILESTONE_AMOUNT);
        bytes memory execCalldata = _transferCalldata(builder, partialAmount);

        vm.expectRevert(
            abi.encodeWithSelector(MilestoneCapEnforcer.AmountMismatch.selector, partialAmount, MILESTONE_AMOUNT)
        );
        enforcer.beforeHook(terms, "", dummyMode, execCalldata, bytes32(0), address(0), address(0));
    }

    function test_beforeHook_revertsOnShortCalldata() public {
        _approveViaAgents();
        bytes memory terms = _terms(MILESTONE_ID, MILESTONE_AMOUNT);
        bytes memory shortCalldata = hex"a9059cbb";

        vm.expectRevert(MilestoneCapEnforcer.InvalidCalldata.selector);
        enforcer.beforeHook(terms, "", dummyMode, shortCalldata, bytes32(0), address(0), address(0));
    }

    function test_beforeHook_revertsOnWrongSelector() public {
        _approveViaAgents();
        bytes memory terms = _terms(MILESTONE_ID, MILESTONE_AMOUNT);
        bytes memory wrongCalldata = abi.encodeWithSignature(
            "approve(address,uint256)", builder, MILESTONE_AMOUNT
        );

        vm.expectRevert(MilestoneCapEnforcer.InvalidCalldata.selector);
        enforcer.beforeHook(terms, "", dummyMode, wrongCalldata, bytes32(0), address(0), address(0));
    }

    function test_encodeTerms_returnsCorrectEncoding() public view {
        bytes memory encoded = enforcer.encodeTerms(MILESTONE_ID, MILESTONE_AMOUNT, address(registry));
        (bytes32 decId, uint256 decAmt, address decReg) = abi.decode(
            encoded, (bytes32, uint256, address)
        );

        assertEq(decId, MILESTONE_ID);
        assertEq(decAmt, MILESTONE_AMOUNT);
        assertEq(decReg, address(registry));
        assertEq(encoded.length, 96);
    }

    function testFuzz_capEnforcement(uint256 cap, uint256 attemptedAmount) public {
        vm.assume(cap < MILESTONE_AMOUNT);
        vm.assume(attemptedAmount > cap);
        vm.assume(attemptedAmount < type(uint128).max);

        _approveViaAgents();

        bytes memory terms = _terms(MILESTONE_ID, cap);
        bytes memory execCalldata = _transferCalldata(builder, attemptedAmount);

        vm.expectRevert(
            abi.encodeWithSelector(MilestoneCapEnforcer.AmountExeedsCap.selector, attemptedAmount, cap)
        );
        enforcer.beforeHook(terms, "", dummyMode, execCalldata, bytes32(0), address(0), address(0));
    }
}
